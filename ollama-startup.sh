#!/bin/bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Modify the systemd service to listen on all interfaces
mkdir -p /etc/systemd/system/ollama.service.d
cat <<EOF > /etc/systemd/system/ollama.service.d/override.conf
[Service]
Environment="OLLAMA_HOST=0.0.0.0"
EOF

# Reload and restart Ollama
systemctl daemon-reload
systemctl restart ollama

# Wait for service to be up
sleep 10

# Pull the model
ollama pull llama3
