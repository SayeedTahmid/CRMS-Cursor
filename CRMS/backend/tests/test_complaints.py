import json

def test_create_complaint_happy(client, auth_header, seed_customer):
    res = client.post("/api/complaints", headers=auth_header, json={
        "customerId": seed_customer["id"],
        "title": "Billing issue",
        "description": "Charged twice",
        "category": "billing",
        "severity": "medium"
    })
    assert res.status_code == 201
    data = res.get_json()["data"]
    assert data["ticketNumber"].startswith("COMP-")

def test_update_status_resolved(client, auth_header, seed_complaint):
    res = client.put(f"/api/complaints/{seed_complaint['id']}/status",
                     headers=auth_header, json={"status":"resolved","resolutionNotes":"Refund issued","customerSatisfaction":4})
    assert res.status_code == 200
