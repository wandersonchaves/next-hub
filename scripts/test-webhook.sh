#!/bin/bash

# Configurações do teste
API_URL="http://localhost:3001"
ORG_ID="cmpi7njpf0003y63zerbqp2w0"
BRANCH_ID="cmpichw4a0000t83z5ucpfa78"
# O número da Silésia no banco é 5586994037788
PHONE="5586994037788"

echo "🚀 Simulando recebimento de mensagem via Webhook..."
echo "Lead: Silésia de Castro"
echo "Org: $ORG_ID"

curl -X POST "$API_URL/webhooks/whatsapp/evolution" \
  -H "Content-Type: application/json" \
  -H "organization-id: $ORG_ID" \
  -H "branch-id: $BRANCH_ID" \
  -d '{
    "event": "messages.upsert",
    "instance": "whatsapp-pessoal-wanderson",
    "data": {
      "key": {
        "remoteJid": "'$PHONE'@s.whatsapp.net",
        "fromMe": false,
        "id": "SIMULATED-'$(date +%s)'"
      },
      "message": {
        "conversation": "Olá, recebi sua proposta! Gostaria de saber mais sobre como funciona o agendamento."
      },
      "messageTimestamp": '$(date +%s)',
      "pushName": "Silésia de Castro"
    }
  }'

echo -e "\n\n✅ Simulação enviada. Verifique os logs 'GOD-MODE' no terminal da API."
