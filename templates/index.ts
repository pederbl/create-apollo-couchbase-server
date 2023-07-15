import { install } from '../helpers/install.js'
import { makeDir } from '../helpers/make-dir.js'

import cpy from 'cpy'
import globOrig from 'glob'
import os from 'os'
import fs from 'fs'
import chalk from 'chalk'
import util from 'util'
import { Sema } from 'async-sema'

import { GetTemplateFileArgs, InstallTemplateArgs } from './types.js'

import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const glob = util.promisify(globOrig)

/**
 * Get the file path for a given file in a template, e.g. "next.config.js".
 */
export const getTemplateFile = ({
  template,
  mode,
  file,
}: GetTemplateFileArgs): string => {
  return path.join(__dirname, template, mode, file)
}

export const SRC_DIR_NAMES = ['src']

/**
 * Install a Next.js internal template to a given `root` directory.
 */
export const installTemplate = async ({
  appName,
  root,
  packageManager,
  isOnline,
  template,
  mode,
  tailwind,
  eslint,
  srcDir,
  importAlias,
}: InstallTemplateArgs) => {
  console.log(chalk.bold(`Using ${packageManager}.`))

  /**
   * Copy the template files to the target directory.
   */
  console.log('\nInitializing project with template:', template, '\n')
  const templatePath = path.join(__dirname, template, mode)
  const copySource = ['**']
  if (!eslint) copySource.push('!eslintrc.json')
  if (!tailwind) copySource.push('!tailwind.config.js', '!postcss.config.js')

  await cpy(copySource, root, {
    parents: true,
    cwd: templatePath,
    rename: (name) => {
      switch (name) {
        case 'gitignore':
        case 'eslintrc.json': {
          return '.'.concat(name)
        }
        // README.md is ignored by webpack-asset-relocator-loader used by ncc:
        // https://github.com/vercel/webpack-asset-relocator-loader/blob/e9308683d47ff507253e37c9bcbb99474603192b/src/asset-relocator.js#L227
        case 'README-template.md': {
          return 'README.md'
        }
        default: {
          return name
        }
      }
    },
    dot: true
  })

  const tsconfigFile = path.join(
    root,
    mode === 'js' ? 'jsconfig.json' : 'tsconfig.json'
  )
  await fs.promises.writeFile(
    tsconfigFile,
    (await fs.promises.readFile(tsconfigFile, 'utf8'))
      .replace(
        `"@/*": ["./*"]`,
        srcDir ? `"@/*": ["./src/*"]` : `"@/*": ["./*"]`
      )
      .replace(`"@/*":`, `"${importAlias}":`)
  )

  // update import alias in any files if not using the default
  if (importAlias !== '@/*') {
    console.log("importAlias: ", importAlias); 
    const files = await glob('**/*', { cwd: root, dot: true })
    const writeSema = new Sema(8, { capacity: files.length })
    await Promise.all(
      files.map(async (file) => {
        // We don't want to modify compiler options in [ts/js]config.json
        if (file === 'tsconfig.json' || file === 'jsconfig.json') return
        await writeSema.acquire()
        const filePath = path.join(root, file)
        if ((await fs.promises.stat(filePath)).isFile()) {
          await fs.promises.writeFile(
            filePath,
            (
              await fs.promises.readFile(filePath, 'utf8')
            ).replace(`@/`, `${importAlias.replace(/\*/g, '')}`)
          )
        }
        await writeSema.release()
      })
    )
  }

  if (srcDir) {
    await makeDir(path.join(root, 'src'))
    await Promise.all(
      SRC_DIR_NAMES.map(async (file) => {
        await fs.promises
          .rename(path.join(root, file), path.join(root, 'src', file))
          .catch((err) => {
            if (err.code !== 'ENOENT') {
              throw err
            }
          })
      })
    )

    const isAppTemplate = template.startsWith('app')

    // Change the `Get started by editing pages/index` / `app/page` to include `src`
    const indexPageFile = path.join(
      'src',
      isAppTemplate ? 'app' : 'pages',
      `${isAppTemplate ? 'page' : 'index'}.${mode === 'ts' ? 'tsx' : 'js'}`
    )

    await fs.promises.writeFile(
      indexPageFile,
      (
        await fs.promises.readFile(indexPageFile, 'utf8')
      ).replace(
        isAppTemplate ? 'app/page' : 'pages/index',
        isAppTemplate ? 'src/app/page' : 'src/pages/index'
      )
    )

    if (tailwind) {
      const tailwindConfigFile = path.join(root, 'tailwind.config.js')
      await fs.promises.writeFile(
        tailwindConfigFile,
        (
          await fs.promises.readFile(tailwindConfigFile, 'utf8')
        ).replace(
          /\.\/(\w+)\/\*\*\/\*\.\{js,ts,jsx,tsx,mdx\}/g,
          './src/$1/**/*.{js,ts,jsx,tsx,mdx}'
        )
      )
    }
  }

  /**
   * Create a package.json for the new project.
   */
  const packageJson = {
    name: appName,
    version: '0.0.1',
    private: true,
    keywords: [],
    author: "",
    license: "ISC",
    main: "dist/index.js",
    type: "module",
    scripts: {
      init: "npm run generate-graphql-types",
      dev: "nodemon -r dotenv/config src/index.ts",
      "generate-graphql-types": "graphql-codegen --config codegen.ts",
      "generate-resource": "generate-resource",
      "postgenerate-resource": "npm run generate-graphql-types"
    }
  }

  /**
   * Write it to disk.
   */
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify(packageJson, null, 2) + os.EOL
  )

  /**
   * These flags will be passed to `install()`, which calls the package manager
   * install process.
   */
  const installFlags = { packageManager, isOnline }

  /**
   * Default dependencies.
   */
  const dependencies = [
    "apollo-couchbase",
    "couchbase",
    "graphql",
    "@graphql-codegen/cli",
    "@graphql-codegen/typescript-resolvers",
    "nodemon"
  ]

  /**
   * TypeScript projects will have type definitions and other devDependencies.
   */
  if (mode === 'ts') {
    dependencies.push(
      'typescript',
      '@types/node'
    )
  }

  /**
   * Add Tailwind CSS dependencies.
   */
  if (tailwind) {
    dependencies.push('tailwindcss', 'postcss', 'autoprefixer')
  }

  /**
   * Default eslint dependencies.
   */
  if (eslint) {
    dependencies.push('eslint')
  }
  /**
   * Install package.json dependencies if they exist.
   */
  if (dependencies.length) {
    console.log()
    console.log('Installing dependencies:')
    for (const dependency of dependencies) {
      console.log(`- ${chalk.cyan(dependency)}`)
    }
    console.log()

    await install(root, dependencies, installFlags)
  }
}

export * from './types.js'
