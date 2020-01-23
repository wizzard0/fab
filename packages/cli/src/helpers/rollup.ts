import { InputOptions, OutputOptions, rollup } from 'rollup'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import json from '@rollup/plugin-json'
import typescript from '@rollup/plugin-typescript'
import builtins from 'rollup-plugin-node-builtins'
import globals from 'rollup-plugin-node-globals'
import fs from 'fs-extra'

// @ts-ignore
import hypothetical from 'rollup-plugin-hypothetical'
import { FabConfig } from '@fab/core'
import { BuildFailedError } from '../errors'
// @ts-ignore
import nodeEval from 'node-eval'
import { log } from './index'

export default class Rollup {
  private config: FabConfig

  constructor(config: FabConfig) {
    this.config = config
    if (this.config.rollup_plugins) {
      for (const [rollup_plugin_name, plugin_args] of Object.entries(
        this.config.rollup_plugins
      )) {
        const rollup_plugin = this.loadPlugin(rollup_plugin_name)
        /* Loading the plugin would go here. It's easy enough, but do we want
         * to expose this kind of control? */
      }
    }
  }

  private loadPlugin(rollup_plugin_name: string) {
    // When using `fab build` globally, search the local project's node_modules too.
    // There's probably a better way to do this but I don't know it.
    const paths = [`${process.cwd()}/node_modules`, ...(require.resolve.paths('') || [])]
    try {
      return require(require.resolve(rollup_plugin_name, { paths }))
    } catch (e) {
      throw new BuildFailedError(
        `FAB Config references Rollup plugin '${rollup_plugin_name}'. Are you sure it's installed?\nRollup reported the following:\n  ${
          e.toString().split('\n')[0]
        }`
      )
    }
  }

  async compileAndRequire(path: string) {
    try {
      const contents = await fs.readFile(path, 'utf8')
      // console.log({contents})
      const no_exports = contents.replace(/^.*?\(/, '(')
      // console.log({no_exports})
      const src = `
        export const { build, runtime } = ${no_exports}
      `
      console.log(src)
      const { output } = await this.compile('./entry-module', {
        generate: { format: 'cjs', exports: 'named' },
        hypotheticals: {
          './entry-module': src,
        },
      })
      return {
        src,
        module: nodeEval(output),
      }
    } catch (rollup_e) {
      throw new BuildFailedError(
        `Rollup build failed for plugin ${path}. Rollup reported the following:\n  ${rollup_e}`
      )
    }
  }

  async compile(
    input: string,
    {
      generate,
      hypotheticals = {},
      input_opts = {},
    }: {
      generate: OutputOptions
      hypotheticals?: {}
      input_opts?: InputOptions
    }
  ) {
    const warnings: string[] = []

    const bundle = await rollup({
      input,
      plugins: [
        hypothetical({
          files: hypotheticals,
          allowFallthrough: true,
        }),
        resolve({
          preferBuiltins: true,
        }),
        globals(),
        builtins(),
        commonjs(),
        typescript(),
        json(),
      ],

      onwarn(warning, handler) {
        if (warning.code === 'UNRESOLVED_IMPORT') {
          warnings.push(
            `Could not find module '${warning.source}' during build of '${warning.importer}'`
          )
        } else {
          handler(warning)
        }
      },
    })

    const {
      output: [output, ...chunks],
    } = await bundle.generate(generate)

    if (chunks.length > 0) {
      log.error(`WARNING: Didn't expect there to be more than one chunk created! Got:`)
      console.log(chunks)
    }

    console.log('#### INPUT ####')
    console.log(input)
    console.log('#### OUTPUT ####')
    console.log(output.code)
    console.log('\n\n')
    return { warnings, output: output.code }
  }
}
