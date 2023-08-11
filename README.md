# Create Apollo On The Couch Server

The easiest way to get started with Apollo On The Couch is by using `create-apollo-couchbase-server`. This CLI tool enables you to quickly start building a new Apollo On The Couch application, with everything set up for you. To get started, use the following command:

### Interactive

You can create a new project interactively by running:

```bash
npx create-apollo-couchbase-server@latest
# or
yarn create apollo-couchbase-server
# or
pnpm create apollo-couchbase-server
```

You will be asked for the name of your project.

### Non-interactive

You can also pass command line arguments to set up a new project
non-interactively. See `create-next-app --help`:

```bash
npx create-apollo-couchbase-server@latest <project-directory> [options]

Options:
  -V, --version                      output the version number

  --use-npm

    Explicitly tell the CLI to bootstrap the app using npm

  --use-pnpm

    Explicitly tell the CLI to bootstrap the app using pnpm

  --use-yarn

    Explicitly tell the CLI to bootstrap the app using Yarn
```
