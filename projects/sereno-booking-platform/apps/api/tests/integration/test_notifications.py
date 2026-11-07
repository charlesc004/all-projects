from .conftest import login


async def test_assignment_changes_notify_only_the_affected_professional(client):
    await login(client, "admin")
    response = await client.put("/api/v1/admin/staff/1/services", json={"service_ids": [1, 3]})
    assert response.status_code == 200
    await login(client, "staff")
    updates = (await client.get("/api/v1/notifications")).json()
    notice = next(n for n in updates if n["title"] == "Your service assignments changed")
    assert notice["appointment_id"] is None
    assert "Signature Massage" in notice["message"]
    assert (await client.patch(f"/api/v1/notifications/{notice['id']}/read")).status_code == 200
