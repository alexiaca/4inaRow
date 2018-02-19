/*
 * grrd's 4 in a Row
 * Copyright (c) 2012 Gerard Tyedmers, grrd@gmx.net
 * Licensed under the MPL License
 *
 * Instructions:
 * - Install node (https://nodejs.org/en/)
 * - Install dependencies: npm install (in the path where package.json is)
 * - Start the application: node 4inaRowServer.js (in the path where 4inaRowServer.js is)
 *
 * Useful Commands:
 * - get Version of Node: node -v
 * - get Version of NPM: npm -v
 * - get installed Packages: npm ls --depth=0
 * - set debug level: set DEBUG=*
 */

/*jslint browser:true, for:true */ /*global  require __dirname */

(function () {
    "use strict";

    var fs = require("fs");

    function getNewestFile(dir, regexp) {
        var path = require("path");
        var newest = null;
        var files = fs.readdirSync(dir);
        var i;
        var f_time;
        var newest_time;

        for (i = 0; i < files.length; i += 1) {
            if (regexp.test(files[i])) {
                if (newest === null) {
                    newest = files[i];
                    newest_time = fs.statSync(path.join(dir, newest)).mtime.getTime();
                } else {
                    f_time = fs.statSync(path.join(dir, files[i])).mtime.getTime();
                    if (f_time > newest_time) {
                        newest = files[i];
                        newest_time = f_time;
                    }
                }
            }
        }

        if (newest !== null) {
            return (path.join(dir, newest));
        }
        return null;
    }

    var options = {
        // key: fs.readFileSync('ssl/9d144_c0743_0f74a9bdb5828809fd0f68ff5aa1417f.key'),
        // cert: fs.readFileSync('ssl/grrd_a2hosted_com_9d144_c0743_1536306467_68a1ff505d39b287163527f98aa35721.crt')
        // key: fs.readFileSync('../../ssl/keys/9d144_c0743_0f74a9bdb5828809fd0f68ff5aa1417f.key'),
        // cert: fs.readFileSync('../../ssl/certs/grrd_a2hosted_com_9d144_c0743_1536306467_68a1ff505d39b287163527f98aa35721.crt')
        key: fs.readFileSync(getNewestFile("../../ssl/keys", new RegExp(".*.key$"))),
        cert: fs.readFileSync(getNewestFile("../../ssl/certs", new RegExp(".*.crt$")))
    };

    function handler(ignore, res) {
        fs.readFile(
            __dirname + "/index.html",
            function (err, data) {
                if (err) {
                    res.writeHead(500);
                    return res.end("Error loading index.html");
                }

                res.writeHead(200);
                res.end(data);
            }
        );
    }

    var app = require("https").createServer(options, handler);
    var io = require("socket.io").listen(app);
    var Moniker = require("moniker");
    app.listen(49152);

    var users = [];

    var startgame = function () {
        var i;
        for (i = 0; i < users.length; i += 1) {
            if (i === users.length - 1) {
                // kein freier Gegner
                io.to(users[i].id).emit("connect", users[i]);
            } else {
                // Gegner vorhanden
                if (users[i].opponent === null) {
                    users[i].opponent = users[users.length - 1].id;
                    users[i].role = "0";
                    io.to(users[i].id).emit("startgame", users[i]);
                    users[users.length - 1].opponent = users[i].id;
                    users[users.length - 1].role = "1";
                    io.to(users[users.length - 1].id).emit("startgame", users[users.length - 1]);
                    break;
                }
            }
        }
    };

    var addUser = function (socket) {
        var user = {
            name: Moniker.choose(),
            id: socket.id,
            role: null,
            opponent: null
        };
        users.push(user);
        startgame();
        return user;
    };

    var removeUser = function (user) {
        var i;
        for (i = 0; i < users.length; i += 1) {
            if (user.name === users[i].name) {
                users.splice(i, 1);
                return;
            }
        }
    };

    io.on("connection", function (socket) {
        var user = addUser(socket);

        socket.on("disconnect", function () {
            if (user.opponent !== null) {
                io.to(user.opponent).emit("quit", user);
            }
            removeUser(user);
        });

        socket.on("playsend", function (data) {
            io.to(data.to).emit("playget", data);
        });

        socket.on("usersend", function (data) {
            io.to(data.to).emit("userget", data);
        });


    });

}());