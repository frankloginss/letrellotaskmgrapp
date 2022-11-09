import express from "express";
import cors from "cors";
import { createServer } from "https";
import { Server } from "socket.io";
import { Socket } from "./types/socket.interface";
import mongoose from "mongoose";
import * as usersController from "./controllers/users";
import authMiddleware from "./middlewares/auth";
import * as boardsController from "./controllers/boards";
import * as columnsController from "./controllers/columns";
import * as tasksController from "./controllers/tasks";
import { SocketEventsEnum } from "./types/socketEvents.enum";
import jwt from "jsonwebtoken";
import { secret } from "./config";
import User from "./models/user"
import { readFileSync } from "fs";

let options = {
  cert: readFileSync('/etc/letsencrypt/live/letrello-taskmgrapp.cf/cert.pem'),
  // ca: readFileSync('/etc/letsencrypt/live/letrello-taskmgrapp.cf/'),
  key: readFileSync('/etc/letsencrypt/live/letrello-taskmgrapp.cf/privkey.pem'),
};

const app = express();
const httpServer = createServer(options, app);
const io = new Server(httpServer, {
  cors: {
    // origin: 'http://domain.com',
    origin: '*'
  }
});
const db_name: string = 'letrello';

// app.use(cors());
/** Using cors to connect via ip address to be accessed outside system*/
var allowedOrigins = ["https://letrello-taskmgrapp.cf", "https://localhost", "http://letrello-taskmgrapp.cf", "http://localhost"];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin
      // (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        var msg =
          "The CORS policy for this site does not " +
          "allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));



mongoose.set("toJSON", {
  virtuals: true,
  transform: (_, converted) => {
    delete converted._id;
  },
});

app.get("/", (req, res) => {
  res.send("API IS UP");
});



app.post("/api/users", usersController.register);
app.post("/api/users/login", usersController.login);
app.get("/api/user", authMiddleware, usersController.currentUser);
app.get("/api/boards", authMiddleware, boardsController.getBoards);
app.post("/api/boards", authMiddleware, boardsController.createBoard);
app.get("/api/boards/:boardId", authMiddleware, boardsController.getBoard);// => app.get(req, res, next)
app.get("/api/boards/:boardId/columns", authMiddleware, columnsController.getColumns)
app.get("/api/boards/:boardId/tasks", authMiddleware, tasksController.getTasks)



io.use(async (socket: Socket, next) => {
  try {

    const token = (socket.handshake.auth.token as string) ?? "";

    const data = jwt.verify(token.split(" ")[1], secret) as {
      id: string;
      email: string;
    };

    const user = await User.findById(data.id);

    if (!user) {
      return next(new Error("Authentication error"));
    }

    socket.user = user;

    next();

  } catch (err) {

    next(new Error("Authentication error"));

  }
}).on("connection", (socket) => {
  // console.log("socket io connected");
  socket.on(SocketEventsEnum.boardsJoin, (data) => {
    boardsController.joinBoard(io, socket, data);
  });
  socket.on(SocketEventsEnum.boardsLeave, (data) => {
    boardsController.leaveBoard(io, socket, data); // => boardsController.leaveBoard(req, res, next);
  });
  socket.on(SocketEventsEnum.columnsCreate, data => {
    columnsController.createColumn(io, socket, data)
  });
  socket.on(SocketEventsEnum.tasksCreate, data => {
    tasksController.createTask(io, socket, data)
  });
  socket.on(SocketEventsEnum.boardsUpdate, (data) => {
    boardsController.updateBoard(io, socket, data);
  });
  socket.on(SocketEventsEnum.boardsDelete, (data) => {
    boardsController.deleteBoard(io, socket, data);
  });
  socket.on(SocketEventsEnum.columnsDelete, (data) => {
    columnsController.deleteColumn(io, socket, data);
  });
  socket.on(SocketEventsEnum.columnsUpdate, (data) => {
    columnsController.updateColumn(io, socket, data);
  });
  socket.on(SocketEventsEnum.tasksUpdate, (data) => {
    tasksController.updateTask(io, socket, data);
  });
  socket.on(SocketEventsEnum.tasksDelete, (data) => {
    tasksController.deleteTask(io, socket, data);
  });
});


mongoose
  .connect("mongodb://localhost:27017/" + db_name)
  .then(() => {
    console.log("connected to mongo");
    const port = process.env.PORT || 4001;
    httpServer.listen(port, () => {
      console.log(`API is listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.log("error connecting to mongodb", err);
  });

// io.on('connection', (socket: Socket) => {
//   console.log('a user connected');
//   socket.on('disconnect', () => {
//     console.log('user disconnected');
//   });
// });
