import requests

API_URL = "https://api.taiga.io/api/v1/auth"

payload = {
    "type": "normal",
    "username": "sayeedtahmid",          # 👈 your Taiga username
    "password": "Tahmid@10"    # 👈 your Taiga password
}

resp = requests.post(API_URL, json=payload, timeout=10)
resp.raise_for_status()
data = resp.json()

print("Auth token:")
print(data.get("auth_token"))
