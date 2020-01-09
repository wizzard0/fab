import { Command, flags } from '@oclif/command'
import { InvalidConfigError } from '../errors'
import { ServerArgs, SandboxType } from '@fab/core'
import Server from '@fab/server'

export default class Serve extends Command {
  static description = 'Serve a FAB in a local NodeJS Express server'

  static examples = [
    `$ fab serve fab.zip`,
    `$ fab serve --port=3001 fab.zip`,
    `$ fab serve --cert=local-ssl.cert --key=local-ssl.key fab.zip`,
  ]

  static flags = {
    help: flags.help({ char: 'h' }),
    port: flags.string({
      description: 'Port to use',
      env: 'PORT',
      default: '3000',
      required: true,
    }),
    cert: flags.string({
      description: 'SSL certificate to use',
    }),
    key: flags.string({
      description: 'Key for the SSL Certificate',
    }),
    'experimental-v8-sandbox': flags.boolean({
      description:
        'Enable experimental V8::Isolate Runtime (in development, currently non-functional)',
    }),
  }

  static args = [{ name: 'file' }]

  async run() {
    const { args, flags } = this.parse(Serve)

    const server = new Server(args.file, flags as ServerArgs)
    await server.serve(
      flags['experimental-v8-sandbox'] ? SandboxType.v8isolate : SandboxType.nodeVm
    )
  }
}
