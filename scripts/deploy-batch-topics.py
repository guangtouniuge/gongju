import os
import paramiko

root = '/www/wwwroot/geoskill.7chacha.com'
client = paramiko.SSHClient()
client.load_system_host_keys()
client.connect('geoskill.7chacha.com', username='root', password=os.environ['GEO_DEPLOY_PASSWORD'], timeout=20)

def run(command):
    _, out, err = client.exec_command(command, timeout=240)
    text = out.read().decode()
    error = err.read().decode()
    if out.channel.recv_exit_status() != 0:
        raise RuntimeError(error or text)
    print(text.strip(), flush=True)
    return text

try:
    service = run('systemctl show geo-content-api.service --property=ExecStart --value')
    if root + '/server/geo-api-server.mjs' not in service:
        raise RuntimeError('Unexpected service target')
    run(f'cd {root} && tar -czf /tmp/geoskill-before-batch-topics-v4.tgz server src dist package.json package-lock.json')
    run(f'cd {root} && npm install --no-save --package-lock=false marked@18.0.12 sanitize-html@2.17.7')
    client.open_sftp().put('deploy/geoskill-batch-topics-v4.tgz', '/tmp/geoskill-batch-topics-v4.tgz')
    run(f'tar -xzf /tmp/geoskill-batch-topics-v4.tgz -C {root}')
    run(f'cd {root} && /usr/bin/node --check server/geo-api-server.mjs && /usr/bin/node --input-type=module -e "import(\'./server/article-format.mjs\').then(m=>console.log(m.articleHtml(\'## Ready\')));"')
    run('systemctl restart geo-content-api.service && systemctl is-active geo-content-api.service')
except Exception:
    run(f'tar -xzf /tmp/geoskill-before-batch-topics-v4.tgz -C {root} && systemctl restart geo-content-api.service')
    raise
finally:
    client.close()
