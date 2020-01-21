import * as tmp from 'tmp-promise'
import * as fs from 'fs-extra'
import { shell, cmd } from '../utils'

describe('Create React App E2E Test', () => {
  let tmpdir: string

  it('should allow creation of a tmp dir', async () => {
    const dir = await tmp.dir({ dir: process.env.GITHUB_WORKSPACE })
    tmpdir = dir.path
    await shell(`ls -l ${tmpdir}`)
    const { stdout } = await cmd(`pwd`, { cwd: tmpdir })
    expect(stdout).toMatch('tmp')
  })

  it('should allow creation of a new CRA project into a FAB', async () => {
    await shell(`ls -l ${tmpdir}`)
    await shell(`yarn create react-app cra-test`, { cwd: tmpdir })
    const cwd = `${tmpdir}/cra-test`
    const { stdout: files } = await cmd(`ls -l ${cwd}`)
    expect(files).toMatch('package.json')

    await fs.writeFile(`${cwd}/.env`, `SKIP_PREFLIGHT_CHECK=true`)
    await shell(`cat .env`, { cwd })
    await shell(`fab init -y --skip-install --version=next`, { cwd })
    await shell(`yarn build:fab`, { cwd })

    const { stdout: files_after_fab_build } = await cmd(`ls -l ${cwd}`)
    expect(files_after_fab_build).toMatch('fab.zip')

    await shell(`yarn add npm-run-all`, { cwd })
    const package_json = JSON.parse(await fs.readFile(`${cwd}/package.json`, 'utf8'))
    package_json.scripts = {
      ...package_json.scripts,
      'test:fab': 'run-p --race "test:fab:*"',
      'test:fab:serve': 'fab serve fab.zip',
      'test:fab:test-local':
        'curl -v --retry 3 --retry-connrefused http://localhost:3000/',
    }
    await fs.writeFile(`${cwd}/package.json`, JSON.stringify(package_json, null, 2))

    await shell(`yarn test:fab`, { cwd })

    // const { stdout: test_fab_output } = await cmd(`yarn test:fab`, { cwd })
    //
    // expect(test_fab_output).toMatch(
    //   /^<!DOCTYPE html>.*<script>window.FAB_SETTINGS={.*"__fab_server":"@fab\/server"/
    // )

    // Add a runtime plugin that returns some response
    // Then test for that response.
  })
})
