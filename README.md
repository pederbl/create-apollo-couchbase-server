# Create Apollo On The Couch Server

The easiest way to get started with Apollo On The Couch is by using `create-apollo-couchbase-server`. This CLI tool enables you to quickly start building a new Next.js application, with everything set up for you. You can create a new app using the default Next.js template, or by using one of the [official Next.js examples](https://github.com/vercel/next.js/tree/canary/examples). To get started, use the following command:

### Interactive

You can create a new project interactively by running:

```bash
npx create-apollo-couchbase-server@latest
# or
yarn create apollo-couchbase-server
# or
pnpm create apollo-couchbase-server
```

You will be asked for the name of your project, and then whether you want to
create a TypeScript project:

### Non-interactive

You can also pass command line arguments to set up a new project
non-interactively. See `create-next-app --help`:

```bash
create-next-app <project-directory> [options]

Options:
  -V, --version                      output the version number

  --use-npm

    Explicitly tell the CLI to bootstrap the app using npm

  --use-pnpm

    Explicitly tell the CLI to bootstrap the app using pnpm

  --use-yarn

    Explicitly tell the CLI to bootstrap the app using Yarn
```
