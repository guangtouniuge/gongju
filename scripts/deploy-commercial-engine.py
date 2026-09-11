import os
import json
import time
import paramiko

version = json.load(open('server/writing-release.json', encoding='utf-8'))['version']
root = '/www/wwwroot/geoskill.7chacha.com'
release = root + '/releases/engine-' + version + '-' + str(int(time.time()))
unit = '/etc/systemd/system/geoskill-commercial-api.service'
env_path = '/root/.geoskill/commercial.env'
c = paramiko.SSHClient()
c.load_system_host_keys()
c.connect('geoskill.7chacha.com', username='root', password=os.environ['GEO_DEPLOY_PASSWORD'], timeout=20)

def run(command):
    _, out, err = c.exec_command(command, timeout=90)
    value, error = out.read().decode(), err.read().decode()
    if out.channel.recv_exit_status() != 0: raise RuntimeError(error or value)
    return value

changed = False
env_changed = False
try:
    run("python3 -c \"import pathlib,json,sys; rows=[json.loads(p.read_text()) for p in pathlib.Path('/root/.geoskill/commercial-jobs').glob('JOB-*.json')]; sys.exit(1 if any(r['job']['status'] in ('queued','running') for r in rows) else 0)\"")
    with c.open_sftp() as s:
        with s.file(unit) as f: original = f.read().decode()
        with s.file(env_path) as f: original_env = f.read().decode()
    old = next(line for line in original.splitlines() if line.startswith('ExecStart='))
    if root + '/releases/' not in old: raise RuntimeError('Unexpected service target')
    run(f'mkdir -p {release} && cp {unit} {release}/service-before.conf')
    with c.open_sftp() as s: s.put('deploy/commercial-engine.tgz', release + '/engine.tgz')
    run(f'tar -xzf {release}/engine.tgz -C {release} && ln -s {root}/node_modules {release}/node_modules && cd {release} && node --input-type=module -e "import(\'./server/writing-engine.mjs\')"')
    if os.environ.get('GEO_DEPLOY_THINKING') == 'enabled':
        settings = {'MODEL_NAME': 'deepseek-flash', 'MODEL_THINKING': 'enabled', 'MODEL_REASONING_EFFORT': 'high', 'MODEL_MAX_TOKENS': '24576', 'MODEL_TIMEOUT_MS': '300000'}
        lines = [line for line in original_env.splitlines() if line.split('=', 1)[0] not in settings]
        updated_env = '\n'.join(lines + [f'{key}={value}' for key, value in settings.items()]) + '\n'
        backup_env = '/root/.geoskill/commercial-before-' + version + '-' + str(int(time.time())) + '.env'
        with c.open_sftp() as s:
            with s.file(backup_env, 'w') as f: f.write(original_env)
            s.chmod(backup_env, 0o600)
            env_changed = True
            with s.file(env_path, 'w') as f: f.write(updated_env)
            s.chmod(env_path, 0o600)
    with c.open_sftp() as s:
        changed = True
        with s.file(unit, 'w') as f: f.write(original.replace(old, 'ExecStart=/usr/bin/node ' + release + '/server/geo-api-server.mjs'))
    run('systemctl daemon-reload && systemctl restart geoskill-commercial-api.service && sleep 2 && systemctl is-active --quiet geoskill-commercial-api.service')
    status = run("curl -s -o /dev/null -w '%{http_code}' https://geoskill.7chacha.com/api/state?key=geo.projectRows").strip()
    if status != '401': raise RuntimeError('Login boundary check failed')
    print('Engine deployed: ' + release)
except Exception:
    if env_changed:
        with c.open_sftp() as s:
            with s.file(env_path, 'w') as f: f.write(original_env)
    if changed:
        with c.open_sftp() as s:
            with s.file(unit, 'w') as f: f.write(original)
        run('systemctl daemon-reload && systemctl restart geoskill-commercial-api.service')
    raise
finally: c.close()
