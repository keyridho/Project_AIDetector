#!/bin/bash

# Script untuk restart layanan
# Cloudflare, Nginx, Backend, Frontend, dan Ollama

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Cek apakah dijalankan sebagai root/sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    echo "Usage: sudo ./restart.sh [service-name]"
    exit 1
fi

# Header
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}   RESTART LAYANAN${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Fungsi untuk restart systemd service
restart_service() {
    local service_name=$1
    local display_name=$2
    
    echo -e "${YELLOW}Restarting $display_name...${NC}"
    
    if systemctl list-unit-files | grep -q "${service_name}.service"; then
        systemctl restart "$service_name"
        sleep 2
        
        if systemctl is-active --quiet "$service_name"; then
            echo -e "${GREEN}✓ $display_name restarted successfully${NC}"
            systemctl status "$service_name" --no-pager -l | grep "Active:" | sed 's/^/  /'
        else
            echo -e "${RED}✗ Failed to restart $display_name${NC}"
            systemctl status "$service_name" --no-pager -l | tail -5 | sed 's/^/  /'
        fi
    else
        echo -e "${YELLOW}⚠ $display_name service not found (skipping)${NC}"
    fi
    echo ""
}

# Fungsi untuk kill dan restart proses manual
restart_process() {
    local process_name=$1
    local display_name=$2
    local start_command=$3
    
    echo -e "${YELLOW}Restarting $display_name...${NC}"
    
    # Kill proses yang ada
    if pgrep -f "$process_name" > /dev/null; then
        echo "  Stopping existing process..."
        pkill -f "$process_name"
        sleep 2
    fi
    
    # Start proses baru jika ada command
    if [ -n "$start_command" ]; then
        echo "  Starting new process..."
        eval "$start_command" &
        sleep 2
        
        if pgrep -f "$process_name" > /dev/null; then
            echo -e "${GREEN}✓ $display_name restarted successfully${NC}"
        else
            echo -e "${RED}✗ Failed to restart $display_name${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ No start command provided, process stopped only${NC}"
    fi
    echo ""
}

# Menu pilihan jika tidak ada argumen
if [ $# -eq 0 ]; then
    echo "Pilih layanan yang ingin direstart:"
    echo "1) All Services (Semua)"
    echo "2) Nginx"
    echo "3) Backend"
    echo "4) Frontend"
    echo "5) Ollama"
    echo "6) Cloudflare Tunnel"
    echo "0) Exit"
    echo ""
    read -p "Masukkan pilihan [0-6]: " choice
    
    case $choice in
        1) service="all" ;;
        2) service="nginx" ;;
        3) service="backend" ;;
        4) service="frontend" ;;
        5) service="ollama" ;;
        6) service="cloudflare" ;;
        0) exit 0 ;;
        *) echo -e "${RED}Pilihan tidak valid${NC}"; exit 1 ;;
    esac
else
    service=$1
fi

# Restart berdasarkan pilihan
case $service in
    all)
        echo -e "${BLUE}Restarting ALL services...${NC}"
        echo ""
        
        # 1. Restart Nginx
        restart_service "nginx" "Nginx"
        
        # 2. Restart Backend (AI Detector Backend)
        if systemctl list-unit-files | grep -q "ai-detector-backend.service"; then
            restart_service "ai-detector-backend" "AI Detector Backend"
        else
            echo -e "${YELLOW}⚠ AI Detector Backend service not found as systemd service${NC}"
            echo -e "${YELLOW}  Please restart manually or configure systemd service${NC}"
            echo ""
        fi
        
        # 3. Restart Frontend (AI Detector Frontend)
        if systemctl list-unit-files | grep -q "ai-detector-frontend.service"; then
            restart_service "ai-detector-frontend" "AI Detector Frontend"
        else
            echo -e "${YELLOW}⚠ AI Detector Frontend service not found as systemd service${NC}"
            echo -e "${YELLOW}  Please restart manually or configure systemd service${NC}"
            echo ""
        fi
        
        # 4. Restart Ollama
        restart_service "ollama" "Ollama"
        
        # 5. Restart Cloudflare
        if systemctl list-unit-files | grep -q "cloudflared.service"; then
            restart_service "cloudflared" "Cloudflare Tunnel"
        else
            echo -e "${YELLOW}⚠ Cloudflare Tunnel not found as systemd service${NC}"
            echo ""
        fi
        ;;
        
    nginx)
        restart_service "nginx" "Nginx"
        # Test konfigurasi nginx
        echo -e "${YELLOW}Testing Nginx configuration...${NC}"
        nginx -t
        echo ""
        ;;
        
    backend)
        if systemctl list-unit-files | grep -q "ai-detector-backend.service"; then
            restart_service "ai-detector-backend" "AI Detector Backend"
        else
            echo -e "${RED}AI Detector Backend service not found!${NC}"
            echo "Available options:"
            echo "  - Configure systemd service: /etc/systemd/system/ai-detector-backend.service"
            echo "  - Restart manually with pm2/npm/python"
            exit 1
        fi
        ;;
        
    frontend)
        if systemctl list-unit-files | grep -q "ai-detector-frontend.service"; then
            restart_service "ai-detector-frontend" "AI Detector Frontend"
        else
            echo -e "${RED}AI Detector Frontend service not found!${NC}"
            echo "Available options:"
            echo "  - Configure systemd service: /etc/systemd/system/ai-detector-frontend.service"
            echo "  - Restart manually with npm/yarn"
            exit 1
        fi
        ;;
        
    ollama)
        restart_service "ollama" "Ollama"
        # Test Ollama API
        sleep 3
        echo -e "${YELLOW}Testing Ollama API...${NC}"
        if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Ollama API is responding${NC}"
        else
            echo -e "${RED}✗ Ollama API not responding${NC}"
        fi
        echo ""
        ;;
        
    cloudflare)
        if systemctl list-unit-files | grep -q "cloudflared.service"; then
            restart_service "cloudflared" "Cloudflare Tunnel"
        else
            echo -e "${RED}Cloudflare Tunnel service not found!${NC}"
            echo "Install with: curl -L https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-archive-keyring.gpg >/dev/null"
            exit 1
        fi
        ;;
        
    *)
        echo -e "${RED}Unknown service: $service${NC}"
        echo "Available services: all, nginx, backend, frontend, ollama, cloudflare"
        exit 1
        ;;
esac

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}Restart completed!${NC}"
echo -e "${YELLOW}Run './status.sh' to check service status${NC}"
echo ""
