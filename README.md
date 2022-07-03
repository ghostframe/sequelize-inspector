# sequelize-inspector

Inspect sequelize's connection pool usage and query performance.

## Usage:

```ts
import SequelizeInspector from 'sequelize-inspector'

// ... setup sequelize and express

SequelizeInspector.init(express, sequelize)
```

Now open up `/sequelize` and you'll see something like this: