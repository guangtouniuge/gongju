import json
import os
import pathlib
import secrets
import shlex
import time
import paramiko

root = '/www/wwwroot/geoskill.7chacha.com'
release = root + '/releases/commercial-20260911'
nginx = '/etc/nginx/conf.d/geoskill.7chacha.com.conf'
stamp = str(int(time.time()))
backup = '/root/.geoskill/backups/commercial-' + stamp
credentials_path = pathlib.Path('.tmp/commercial-credentials.json')
if credentials_path.exists():
    credentials = json.loads(credentials_path.read_text(encoding='utf-8'))
else:
    credentials = {'admin': {'username': 'admin', 'password': secrets.token_urlsafe(24)}, 'project': {'username': 'baoguanglv', 'password': secrets.token_urlsafe(24)}, 'projectId': 'exposure-main'}
    credentials_path.parent.mkdir(exist_ok=True)
    credentials_path.write_text(json.dumps(credentials, ensure_ascii=False, indent=2), encoding='utf-8')

c = paramiko.SSHClient()
c.load_system_host_keys()
c.connect('geoskill.7chacha.com', username='root', password=os.environ['GEO_DEPLOY_PASSWORD'], timeout=20)
def run(command, data=None):
    inp, out, err = c.exec_command(command, timeout=180)
    if data is not None: inp.write(data); inp.flush(); inp.channel.shutdown_write()
    value, error = out.read().decode(), err.read().decode()
    if out.channel.recv_exit_status() != 0: raise RuntimeError(error or value)
    return value
def put_text(name, value, mode=0o600):
    with c.open_sftp() as sftp:
        with sftp.file(name, 'w') as f: f.write(value)
        sftp.chmod(name, mode)

switched = False
try:
    run("if systemctl is-active --quiet geoskill-commercial-api.service; then echo 'Initial migration already completed; refusing to overwrite the active release.' >&2; exit 1; fi")
    run(f"test ! -d {release} || {{ echo 'Release directory already exists; inspect before retrying.' >&2; exit 1; }}")
    run("python3 -c \"import pathlib,json,sys; rows=[json.loads(p.read_text()) for p in (pathlib.Path.home()/'.geoskill/jobs').glob('JOB-*.json')]; sys.exit(1 if any(r['job']['status'] in ('queued','running') for r in rows) else 0)\"")
    run(f'mkdir -p {backup} {release} && chmod 700 /root/.geoskill {backup} && cp {nginx} {backup}/nginx.conf && cd {root} && tar -czf {backup}/data-before.tgz outputs')
    with c.open_sftp() as sftp: sftp.put('deploy/geoskill-commercial.tgz', '/tmp/geoskill-commercial.tgz')
    run(f'tar -xzf /tmp/geoskill-commercial.tgz -C {release} && ln -sfn {root}/node_modules {release}/node_modules')
    env = {'GEO_API_PORT': '8788', 'GEO_AUTH_DATA_DIR': '/root/.geoskill/auth', 'GEO_JOB_DIR': '/root/.geoskill/commercial-jobs', 'GEO_ADMIN_USERNAME': credentials['admin']['username'], 'GEO_ADMIN_PASSWORD': credentials['admin']['password'], 'GEO_APP_ORIGIN': 'https://geoskill.7chacha.com', 'GEO_COOKIE_SECURE': 'true', 'GEO_ALLOW_HEADER_IDENTITY': 'false', 'GEO_ALLOW_LEGACY_ANONYMOUS': 'false', 'GEO_ALLOW_UNREGISTERED_AUTH_PROJECT': 'false', 'GEO_TRUST_PROXY': 'true'}
    put_text('/root/.geoskill/commercial.env', '\n'.join(f'{k}={v}' for k,v in env.items()) + '\n')
    unit = f'''[Unit]
Description=Geoskill authenticated content service
After=network.target
[Service]
Type=simple
WorkingDirectory={root}
EnvironmentFile=/root/.geoskill/commercial.env
ExecStart=/usr/bin/node {release}/server/geo-api-server.mjs
Restart=on-failure
RestartSec=3
UMask=0077
[Install]
WantedBy=multi-user.target
'''
    put_text('/etc/systemd/system/geoskill-commercial-api.service', unit, 0o644)
    run(f'cd {release} && node --check server/geo-api-server.mjs && node --input-type=module -e "import(\'./server/writing-engine.mjs\')"')
    run('systemctl daemon-reload && systemctl enable --now geoskill-commercial-api.service && sleep 2')
    provision = '''import json,sys,urllib.request,urllib.error
x=json.loads(sys.stdin.readline())
def call(route,data=None,cookie=''):
 r=urllib.request.Request('http://127.0.0.1:8788'+route,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json','Cookie':cookie})
 with urllib.request.urlopen(r) as response:return json.load(response),response.headers.get('Set-Cookie','').split(';')[0]
_,cookie=call('/api/auth/login',x['admin'])
users,_=call('/api/admin/users',None,cookie)
existing=next((u for u in users['users'] if u['username']==x['project']['username']),None)
if existing:u=existing
else:u=call('/api/admin/users',{**x['project'],'role':'project_admin','projectId':x['projectId'],'projectName':'曝光率GEO','displayName':'曝光率项目管理员'},cookie)[0]['user']
print(json.dumps({'ownerId':u['id']}))
'''
    put_text(release + '/provision.py', provision)
    owner = json.loads(run(f'python3 {release}/provision.py', json.dumps(credentials) + '\n'))['ownerId']
    target = f'{root}/outputs/projects/{credentials["projectId"]}/data/app-state.json'
    exists = run(f'test -f {target} && echo yes || echo no').strip() == 'yes'
    if not exists:
        print(run(f'cd {root} && node {release}/scripts/migrate-commercial-project.mjs {credentials["projectId"]} {shlex.quote(owner)}').strip())
    with c.open_sftp() as sftp:
        with sftp.file(nginx) as f: config = f.read().decode()
    config = config.replace(root + '/dist', release + '/dist').replace('127.0.0.1:8787', '127.0.0.1:8788')
    put_text(nginx, config, 0o644)
    switched = True
    run('nginx -t && systemctl reload nginx')
    status = run("curl -s -o /dev/null -w '%{http_code}' https://geoskill.7chacha.com/api/state?key=geo.projectRows").strip()
    if status != '401': raise RuntimeError('Anonymous state was not blocked: ' + status)
    env.pop('GEO_ADMIN_PASSWORD'); env.pop('GEO_ADMIN_USERNAME')
    put_text('/root/.geoskill/commercial.env', '\n'.join(f'{k}={v}' for k,v in env.items()) + '\n')
    print('Commercial entry switched. Anonymous state: 401. Credentials saved privately on local machine. Backup: ' + backup)
except Exception:
    if switched: run(f'cp {backup}/nginx.conf {nginx} && nginx -t && systemctl reload nginx')
    raise
finally: c.close()
