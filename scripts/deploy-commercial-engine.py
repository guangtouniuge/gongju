import os
import json
import time
import paramiko

version = json.load(open('server/writing-release.json', encoding='utf-8'))['version']
root = '/www/wwwroot/geoskill.7chacha.com'
release = root + '/releases/engine-' + version + '-' + str(int(time.time()))
unit = '/etc/systemd/system/geoskill-commercial-api.service'
c = paramiko.SSHClient()
c.load_system_host_keys()
c.connect('geoskill.7chacha.com', username='root', password=os.environ['GEO_DEPLOY_PASSWORD'], timeout=20)

def run(command):
    _, out, err = c.exec_command(command, timeout=90)
    value, error = out.read().decode(), err.read().decode()
    if out.channel.recv_exit_status() != 0: raise RuntimeError(error or value)
    return value

changed = False
try:
    run("python3 -c \"import pathlib,json,sys; rows=[json.loads(p.read_text()) for p in pathlib.Path('/root/.geoskill/commercial-jobs').glob('JOB-*.json')]; sys.exit(1 if any(r['job']['status'] in ('queued','running') for r in rows) else 0)\"")
    with c.open_sftp() as s:
        with s.file(unit) as f: original = f.read().decode()
    old = next(line for line in original.splitlines() if line.startswith('ExecStart='))
    if root + '/releases/' not in old: raise RuntimeError('Unexpected service target')
    run(f'mkdir -p {release} && cp {unit} {release}/service-before.conf')
    with c.open_sftp() as s: s.put('deploy/commercial-engine.tgz', release + '/engine.tgz')
    run(f'tar -xzf {release}/engine.tgz -C {release} && ln -s {root}/node_modules {release}/node_modules && cd {release} && node --input-type=module -e "import(\'./server/writing-engine.mjs\')"')
    with c.open_sftp() as s:
        changed = True
        with s.file(unit, 'w') as f: f.write(original.replace(old, 'ExecStart=/usr/bin/node ' + release + '/server/geo-api-server.mjs'))
    run('systemctl daemon-reload && systemctl restart geoskill-commercial-api.service && sleep 2 && systemctl is-active --quiet geoskill-commercial-api.service')
    status = run("curl -s -o /dev/null -w '%{http_code}' https://geoskill.7chacha.com/api/state?key=geo.projectRows").strip()
    if status != '401': raise RuntimeError('Login boundary check failed')
    print('Engine deployed: ' + release)
except Exception:
    if changed:
        with c.open_sftp() as s:
            with s.file(unit, 'w') as f: f.write(original)
        run('systemctl daemon-reload && systemctl restart geoskill-commercial-api.service')
    raise
finally: c.close()
