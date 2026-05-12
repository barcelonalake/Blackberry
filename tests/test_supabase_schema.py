import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / 'supabase' / 'migrations' / '0001_initial_schema.sql'
SQL = MIGRATION.read_text()

REQUIRED_TABLES = ['profiles', 'workspaces', 'workspace_members', 'channels', 'sessions', 'messages', 'artifacts', 'memories', 'tasks', 'agent_runs']
REQUIRED_FRONTEND_COLUMNS = {
    'channels': ['id text primary key', 'name text', 'description text', 'kind text'],
    'sessions': ['id text primary key', 'channel_id text', 'title text', 'kind text', 'status text', 'model text', 'summary text'],
    'messages': ['id text primary key', 'session_id text', 'role text', 'content text', 'time text'],
    'artifacts': ['id text primary key', 'session_id text', 'title text', 'kind text', 'content text', 'version int'],
    'memories': ['id text primary key', 'title text', 'content text', 'scope text', 'active boolean'],
    'tasks': ['id text primary key', 'title text', 'status text', 'priority text', 'session_id text'],
}

def table_block(name: str) -> str:
    match = re.search(rf'create table if not exists {name} \((.*?)\);', SQL, flags=re.S | re.I)
    assert match, f'missing table {name}'
    return re.sub(r'\s+', ' ', match.group(1).lower())

def test_required_tables_exist():
    for table in REQUIRED_TABLES:
        assert f'create table if not exists {table}' in SQL.lower()

def test_frontend_adapter_columns_are_present_with_compatible_names():
    for table, columns in REQUIRED_FRONTEND_COLUMNS.items():
        block = table_block(table)
        for column in columns:
            assert column in block, f'{table} missing compatible column: {column}'

def test_rls_enabled_for_workspace_tables():
    for table in REQUIRED_TABLES:
        assert f'alter table {table} enable row level security;' in SQL.lower()

def test_workspace_membership_policies_exist():
    lowered = SQL.lower()
    assert 'create or replace function is_workspace_member' in lowered
    assert 'using (is_workspace_member(workspace_id))' in lowered
    assert 'with check (is_workspace_member(workspace_id))' in lowered
