#!/bin/bash

echo "======================================"
echo "AI Detector App - Maintenance Script"
echo "======================================"
echo ""

# Fungsi untuk check service status
check_service() {
    SERVICE=$1
    echo -n "Checking $SERVICE... "
    if systemctl is-active --quiet $SERVICE; then
        echo "✓ Running"
    else
        echo "✗ Stopped"
        echo "  Attempting to restart..."
        sudo systemctl restart $SERVICE
    fi
}

# Fungsi untuk check PM2 process
check_pm2() {
    PROCESS=$1
    echo -n "Checking PM2 process $PROCESS... "
    if pm2 list | grep -q "$PROCESS.*online"; then
        echo "✓ Running"
    else
        echo "✗ Stopped"
        echo "  Attempting to restart..."
        pm2 restart $PROCESS
    fi
}

# Check semua services
echo "1. Checking System Services:"
echo "----------------------------"
check_service ollama
check_service ai-detector-backend
check_service nginx
check_service cloudflared
echo ""

# Check PM2 processes
echo "2. Checking PM2 Processes:"
echo "----------------------------"
check_pm2 ai-detector-frontend
echo ""

# Check disk usage
echo "3. Disk Usage:"
echo "----------------------------"
df -h / | tail -n 1
echo ""

# Check memory usage
echo "4. Memory Usage:"
echo "----------------------------"
free -h | grep Mem
echo ""

# Check Ollama models
echo "5. Ollama Models:"
echo "----------------------------"
ollama list
echo ""

# Check logs for errors (last 10 lines)
echo "6. Recent Backend Errors:"
echo "----------------------------"
sudo journalctl -u ai-detector-backend -n 10 --no-pager | grep -i error || echo "No recent errors"
echo ""

# Check API health
echo "7. API Health Check:"
echo "----------------------------"
curl -s http://localhost:8000/health | python3 -m json.tool || echo "API not responding"
echo ""

# Option untuk restart semua
echo ""
read -p "Restart all services? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Restarting all services..."
    sudo systemctl restart ollama
    sudo systemctl restart ai-detector-backend
    sudo systemctl restart nginx
    sudo systemctl restart cloudflared
    pm2 restart ai-detector-frontend
    echo "All services restarted!"
fi

echo ""
echo "Maintenance check complete!"
echo "======================================"
