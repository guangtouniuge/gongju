"""Retire only the authorized gongju test entry; preserve its data."""
import os
import time
import paramiko

client = paramiko.SSHClient()
client.load_system_host_keys()
client.connect('geoskill.7chacha.com', username='root', password=os.environ['GEO_DEPLOY_PASSWORD'], timeout=20)
config = '/etc/nginx/conf.d/gongju.7chacha.com.conf'
backup = '/root/.geoskill/backups/retire-legacy-' + str(int(time.time()))

def run(command):
    _, out, err = client.exec_command(command, timeout=60)
    value, error = out.read().decode(), err.read().decode()
    if out.channel.recv_exit_status() != 0:
        raise RuntimeError(error or value)
    return value

changed = False
try:
    run('systemctl is-active --quiet geoskill-commercial-api.service')
    service = run('systemctl show geo-content-api.service --property=ExecStart --value')
    if '/www/wwwroot/geoskill.7chacha.com/server/geo-api-server.mjs' not in service:
        raise RuntimeError('Unexpected legacy service target')
    run("python3 -c \"import pathlib,json,sys; rows=[json.loads(p.read_text()) for p in pathlib.Path('/root/.geoskill/jobs').glob('JOB-*.json')]; sys.exit(1 if any(r['job']['status'] in ('queued','running') for r in rows) else 0)\"")
    run(f'mkdir -p {backup} && chmod 700 {backup} && cp {config} {backup}/nginx.conf')
    with client.open_sftp() as sftp:
        with sftp.file(config, 'w') as f:
            f.write('server {\n    listen 80;\n    server_name gongju.7chacha.com;\n    return 302 https://geoskill.7chacha.com/;\n}\n')
    changed = True
    run('nginx -t && systemctl reload nginx')
    references = run("grep -R -l '8787' /etc/nginx/conf.d || true").strip()
    if references:
        raise RuntimeError('Other nginx references remain: ' + references)
    run('systemctl disable --now geo-content-api.service')
    run("test -z \"$(ss -lntp | grep ':8787 ')\"")
    status = run("curl -s -o /dev/null -w '%{http_code}' 'https://geoskill.7chacha.com/api/state?key=geo.projectRows'").strip()
    if status != '401':
        raise RuntimeError('Authenticated entry health check failed')
    print('Legacy entry redirected; legacy service stopped and disabled; data preserved. Backup: ' + backup)
except Exception:
    if changed:
        run(f'cp {backup}/nginx.conf {config} && nginx -t && systemctl reload nginx')
    raise
finally:
    client.close()
