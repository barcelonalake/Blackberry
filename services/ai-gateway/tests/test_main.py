from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'

def test_models_include_mock_gateway():
    response = client.get('/v1/models')
    assert response.status_code == 200
    model_ids = {item['id'] for item in response.json()}
    assert 'mock-gateway' in model_ids

def test_create_session_message():
    response = client.post('/v1/sessions/s1/messages', json={
        'messages': [{'role': 'user', 'content': 'hello'}],
        'stream': False,
    })
    assert response.status_code == 200
    data = response.json()
    assert data['session_id'] == 's1'
    assert 'hello' in data['content']
