import os
import time
import json
import paramiko

root = '/www/wwwroot/geoskill.7chacha.com'
with open('server/writing-release.json', encoding='utf-8') as source:
    version = json.load(source)['version']
archive = f'deploy/geoskill-writing-{version}.tgz'
remote_archive = f'/tmp/geoskill-writing-{version}.tgz'
backup = '/tmp/geoskill-before-writing-' + str(int(time.time())) + '.tgz'
client = paramiko.SSHClient()
client.load_system_host_keys()
client.connect('geoskill.7chacha.com', username='root', password=os.environ['GEO_DEPLOY_PASSWORD'], timeout=20)

def run(command):
    _, out, err = client.exec_command(command, timeout=180)
    result, error = out.read().decode(), err.read().decode()
    if out.channel.recv_exit_status() != 0:
        raise RuntimeError(error or result)
    print(result.strip(), flush=True)
    return result

changed = False
try:
    service = run('systemctl show geo-content-api.service --property=ExecStart --value')
    if root + '/server/geo-api-server.mjs' not in service:
        raise RuntimeError('Unexpected service target')
    run(f'cd {root} && tar -czf {backup} server')
    print('Rollback backup: ' + backup, flush=True)
    client.open_sftp().put(archive, remote_archive)
    changed = True
    run(f'tar -xzf {remote_archive} -C {root}')
    run(f'cd {root} && /usr/bin/node --check server/geo-api-server.mjs && /usr/bin/node --input-type=module -e "import(\'./server/writing-engine.mjs\').then(m=>console.log(m.writingRelease))"')
    run('systemctl restart geo-content-api.service && systemctl is-active geo-content-api.service')
    run('sleep 2; curl --fail --silent https://geoskill.7chacha.com/api/config/status >/dev/null')
except Exception:
    if changed:
        run(f'tar -xzf {backup} -C {root} && systemctl restart geo-content-api.service')
    raise
finally:
    client.close()
