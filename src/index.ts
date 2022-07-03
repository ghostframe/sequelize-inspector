import { v4 as uuid } from 'uuid';

const sequelizeInspectorPage = `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@200;300;400;600;700;900&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0-beta1/dist/css/bootstrap.min.css" rel="stylesheet"
    integrity="sha384-0evHe/X+R7YkIZDRvuzKMRqM+OrBnVFBL6DOitfPri4tjfHxaWutUpFmBp4vmVor" crossorigin="anonymous">
  <link rel="stylesheet" href="https://maxst.icons8.com/vue-static/landings/line-awesome/line-awesome/1.3.0/css/line-awesome.min.css">
  <style>
  body {
    font-family: 'Source Sans Pro'
  }

  #graph::-webkit-scrollbar {
    height: 0.5em;
  }
   
  #graph::-webkit-scrollbar-thumb {
    background-color: #dddddd;
    border-radius: 45px;
  }
  </style>
  <title>Sequelize Inspector</title>
</head>

<body class="container">
  <div id="app">
    <h2 class="mb-3 mt-3"><i class="las la-user-secret"></i> sequelize-inspector</h2>
    <button type="button" class="btn btn-secondary btn-sm ms-2 mt-2 position-absolute" @click="refreshing = !refreshing">{{refreshing ? 'Pause' : 'Resume'}}</button>
    <div v-if="events.connections.length > 0">
      <div style="overflow-x: scroll; overflow-y: hidden; border: 1px solid whitesmoke; border-radius: 10px" ref="graph" class="p-3" id="graph">
        <svg :height="rowHeight * (events.connections.length + 3)" :width="timeXRelative(totalDuration)">
          <g v-for="(connection, index) in events.connections">
            <rect :x="timeXAbsolute(connection.startTime)" :width="width(connection)" fill="whitesmoke" stroke="black"
              :y="index * (rowHeight + 5)" :height="rowHeight" rx="7"
              :stroke-width="connection == focusedElement ? 0.3 : 0"
              @mouseenter="focusConnection(connection)"></rect>
            <rect v-for="transaction in connection.transactions" fill="#a6deff" stroke="black" :x="timeXAbsolute(transaction.startTime)"
              :width="width(transaction)" :y="index * (rowHeight + 5)"
              :stroke-width="transaction == focusedElement ? 0.3 : 0"
              :height="rowHeight" @mouseenter="focusTransaction(transaction)"></rect>
            <rect v-for="query in connection.queries" fill="#00a0ff" stroke="black" :x="timeXAbsolute(query.startTime)"
              :stroke-width="query == focusedElement ? 0.3 : 0.1" :width="width(query)" :y="index * (rowHeight + 5) + 5"
              :height="rowHeight - 10" @mouseenter="focusQuery(query)"></rect>
          </g>
          <g v-for="gridLine in gridLines">
            <line :x1="timeXAbsolute(gridLine.time)" :x2="timeXAbsolute(gridLine.time)" :y1="0"
              :y2="rowHeight * (events.connections.length + 3)" stroke="grey" stroke-dasharray="5,5">
            </line>
            <text :x="timeXAbsolute(gridLine.time) + 5" :y="rowHeight * (events.connections.length + 3)"
              fill="grey">{{gridLine.label}}</text>
          </g>
        </svg>
      </div>
      <div v-if="focusedElement" class="mt-5">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">{{focusedElementType}}</h5>
            <table class="table table-borderless mb-0">
              <tr v-if="focusedElementType === 'Query'">
                <td class="text-end align-middle fw-bold pe-3" style="width: 5%">SQL</td>
                <td><code>{{focusedElement.sql ? focusedElement.sql : '(executing...)'}}</code></td>
              </tr>
              <tr>
                <td class="text-end align-middle fw-bold pe-3" style="width: 5%">Duration</td> 
                <td>{{focusedElement.endTime ? 
                  (focusedElement.endTime - focusedElement.startTime) + 'ms' : 
                  (new Date().getTime() - focusedElement.startTime) + 'ms (still going)'}}</td>
              </tr>
              <tr>
                <td class="text-end align-middle fw-bold pe-3" style="width: 5%">Start</td> 
                <td>{{new Date(focusedElement.startTime).toLocaleString('sv') + ':' + new Date(focusedElement.startTime).getMilliseconds()}}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </div>
    <div v-else>
      <p>No data yet.</p>
    </div>
  </div>
  <script src="https://unpkg.com/vue@3"></script>
  <script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>
  <script>
    const { createApp } = Vue

    createApp({
      mounted() {
        const fetchAndScroll = () => {
          if (this.refreshing) {
            fetch("/sequelize/api/events")
              .then(response => response.json())
              .then(events => {
                this.events = events;
                this.$nextTick(() => {
                  if (this.$refs.graph) {
                    this.$refs.graph.scrollLeft += 10000000000000;
                  }
                })
              })
          }
        }
        setInterval(fetchAndScroll, 1000)
        fetchAndScroll()
      },
      data() {
        return {
          refreshing: true,
          rowHeight: 30,
          focusedElement: null,
          focusedElementType: null,
          events: {
            connections: []
          },
        }
      },
      computed: {
        start() {
          return this.events ? this.events.startTime : null;
        },
        totalDuration() {
          return this.events ? new Date().getTime() - this.start : null;
        },
        gridLines() {
          let startTimeAt0Ms = new Date(this.events.startTime);
          startTimeAt0Ms.setMilliseconds(0);
          const lines = [];
          for (var i = startTimeAt0Ms.getTime(); i < new Date().getTime(); i += 1000) {
            lines.push({ time: i, label: new Date(i).toTimeString().substring(0, 8)});
          }
          return lines;
        },
        allQueries() {
          return this.events.connections.flatMap(connection => {
            return connection.queries
          })
        }
      },
      methods: {
        width(timedEvent) {
          const endTime = timedEvent.endTime ? timedEvent.endTime : new Date().getTime();
          return this.timeXAbsolute(endTime) - this.timeXAbsolute(timedEvent.startTime);
        },
        timeXRelative(time) {
          return time / 2;
        },
        timeXAbsolute(timestamp) {
          if (timestamp) {
            return this.timeXRelative(timestamp - this.start)
          } else {
            return this.timeXRelative(this.totalDuration);
          }
        },
        focusQuery(query) {
          this.focusedElement = query;
          this.focusedElementType = 'Query';
        },
        focusTransaction(transaction) {
          this.focusedElement = transaction
          this.focusedElementType = 'Transaction';
        },
        focusConnection(connection) {
          this.focusedElement = connection
          this.focusedElementType = 'Connection';
        }
      }
    }).mount('#app')
  </script>
</body>

</html>`;

function now() {
  return new Date().getTime();
}

class Query {
  constructor(
    public id: any,
    public startTime: number = now(),
    public sql?: string,
    public endTime?: number,
  ) {}
}

class Transaction {
  constructor(public id: string, public startTime: number = now(), public endTime?: number) {}
}

class Connection {
  constructor(
    public id: string,
    public queries: Query[] = [],
    public transactions: Transaction[] = [],
    public startTime: number = now(),
    public endTime?: number
  ) {}
}

class Recording {
  constructor(
    public connections: Connection[] = [],
    public startTime?: number
  ) {}
}

const recording = new Recording();

function findOrCreateConnection(id: string): Connection {
  const existingConnection = recording.connections.find(
    (connection) => connection.id === id
  );
  if (existingConnection) {
    return existingConnection;
  } else {
    const connection = new Connection(id);
    recording.connections.push(connection);
    return connection;
  }
}

function findQuery(connectionId: string, queryId: string): Query | undefined {
  const queries = findOrCreateConnection(connectionId)!.queries;
  return queries.find(query => query.id === queryId);
}

function findTransaction(connectionId: string, transactionId: string): Transaction | undefined {
  const connection = findOrCreateConnection(connectionId);
  if (connection) {
    const transactions = findOrCreateConnection(connectionId)!.transactions;
    return transactions[transactions.length - 1];
  }
}

function queryStarted(connectionId: string, queryId: string): void {
  findOrCreateConnection(connectionId).queries.push(new Query(queryId));
}

function queryEnded(connectionId: string, sql: string, query: any): void {
  const existingQuery = findQuery(connectionId, query);
  if (existingQuery && !existingQuery.endTime) {
    existingQuery.endTime = now();
    existingQuery.sql = sql;
  }
}

function connectionAcquired(id: string): void {
  if (!recording.startTime) {
    recording.startTime = now();
  }
  findOrCreateConnection(id);
}

function connectionReleased(id: string): void {
  findOrCreateConnection(id).endTime = now();
}

function transactionStarted(connectionId: string, transactionId: string): void {
  const connection = findOrCreateConnection(connectionId);
  if (connection) {
    connection.transactions.push(new Transaction(transactionId));
  }
}

function transactionEnded(connectionId: string, transactionId: string): void {
  const transaction = findTransaction(connectionId, transactionId);
  if (transaction && !transaction.endTime) {
    transaction.endTime = now();
  }
}

function getRecording(): Recording {
  return recording;
}

const Recorder = {
  getRecording,
  queryStarted,
  connectionAcquired,
  queryEnded,
  connectionReleased,
  transactionStarted,
  transactionEnded,
};

function getConnectionId(connection: any): any {
  return connection._sequelizeInspectorUuid;
}

function handleAfterConnect(connection: any): void {
  connection._sequelizeInspectorUuid = uuid() // Sequelize sometimes changes connection uuids (e.g. when a transaction starts). So we mark them with our own uuids
  const connectionId = getConnectionId(connection);
  Recorder.connectionAcquired(connectionId);
}

function handleAfterDisconnect(connection: any): void {
  Recorder.connectionReleased(getConnectionId(connection));
}

function handleBeforeQuery(options: any, query: any) {
  if (options.type !== 'DEFERRED') {
    Recorder.queryStarted(getConnectionId(query.connection), query.uuid);
  }
}

function handleAfterQuery(_: any, query: any) {
  const connectionId = getConnectionId(query.connection);
  if (query.sql === 'START TRANSACTION;') {
    Recorder.transactionStarted(connectionId, query.uuid)
  } else if (query.sql === 'COMMIT;' || query.sql === 'ROLLBACK;') {
    Recorder.transactionEnded(connectionId, query.uuid)
  } else {
    Recorder.queryEnded(connectionId, query.sql, query.uuid);
  }
}

function sequelizeInspectorPageHandler(_: any, res: any) {
  res.send(sequelizeInspectorPage);
}

function sequelizeInspectorEventsHandler(_: any, res: any) {
  res.send(Recorder.getRecording());
}

function init(expressApp: any, sequelize: any): void {
  expressApp.get('/sequelize', sequelizeInspectorPageHandler);
  expressApp.get('/sequelize/api/events', sequelizeInspectorEventsHandler);
  sequelize.addHook('afterConnect', handleAfterConnect);
  sequelize.addHook('afterDisconnect', handleAfterDisconnect);
  sequelize.addHook('beforeQuery', handleBeforeQuery);
  sequelize.addHook('afterQuery', handleAfterQuery);
  console.log("[sequelize-inspector] mounted at '/sequelize'")
}

export default {
  init,
};
