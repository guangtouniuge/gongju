"""Deploy UI into a new immutable directory without restarting article jobs."""
import os
import re
import time
import tarfile
from pathlib import PurePosixPath
import paramiko

root = '/www/wwwroot/geoskill.7chacha.com'
release = root + '/releases/ui-cleanup-' + str(int(time.time()))
config = '/etc/nginx/conf.d/geoskill.7chacha.com.conf'
with tarfile.open('deploy/commercial-ui-cleanup.tgz') as archive:
    index = archive.extractfile('dist/index.html').read().decode()
    assets = re.findall(r'(?:src|href)="(/[^"?#]+\.(?:js|css))"', index)
    if not assets or any(not path.startswith('/assets/') for path in assets):
        raise RuntimeError('Commercial UI must be built with npm run build -- --base=/')
    for path in assets:
        archive.getmember(str(PurePosixPath('dist') / path.lstrip('/')))

client = paramiko.SSHClient()
client.load_system_host_keys()
client.connect('geoskill.7chacha.com', username='root', password=os.environ['GEO_DEPLOY_PASSWORD'], timeout=20)

def run(command):
    _, out, err = client.exec_command(command, timeout=90)
    value, error = out.read().decode(), err.read().decode()
    if out.channel.recv_exit_status() != 0:
        raise RuntimeError(error or value)
    return value

original = None
changed = False
try:
    run('systemctl is-active --quiet geoskill-commercial-api.service')
    with client.open_sftp() as sftp:
        with sftp.file(config) as f:
            original = f.read().decode()
    if '127.0.0.1:8788' not in original:
        raise RuntimeError('Unexpected API target')
    roots = re.findall(r'\broot\s+([^;]+);', original)
    if not roots or any(not p.startswith(root + '/releases/') for p in roots):
        raise RuntimeError('Unexpected UI root')
    run(f'test ! -e {release} && mkdir -p {release} && cp {config} {release}/nginx-before.conf')
    with client.open_sftp() as sftp:
        sftp.put('deploy/commercial-ui-cleanup.tgz', release + '/ui.tgz')
    run(f'tar -xzf {release}/ui.tgz -C {release} && test -f {release}/dist/index.html')
    updated = re.sub(r'\broot\s+[^;]+;', 'root ' + release + '/dist;', original)
    with client.open_sftp() as sftp:
        changed = True
        with sftp.file(config, 'w') as f:
            f.write(updated)
    run('nginx -t && systemctl reload nginx')
    status = run("curl -s -o /dev/null -w '%{http_code}' https://geoskill.7chacha.com/api/state?key=geo.projectRows").strip()
    if status != '401':
        raise RuntimeError('Authentication regression')
    for path in assets:
        status = run("curl -s -o /dev/null -w '%{http_code}' https://geoskill.7chacha.com" + path).strip()
        if status != '200':
            raise RuntimeError('UI asset unavailable: ' + path)
    print('UI release deployed: ' + release + '; API service and data unchanged.')
except Exception:
    if changed:
        with client.open_sftp() as sftp:
            with sftp.file(config, 'w') as f:
                f.write(original)
        run('nginx -t && systemctl reload nginx')
    raise
finally:
    client.close()
