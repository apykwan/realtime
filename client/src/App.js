import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import ScrollToBottom from 'react-scroll-to-bottom';
import { css } from '@emotion/css';

import socket from './socket';
import { nameUpperCase } from './util';

const ROOT_CSS = css({
  height: 500,
  width: "100%"
});

function App() {
  const [username, setUsername] = useState('');
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [privateMessage, setPrivateMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState('');
  const [selectedUser, setSelectedUser] = useState("");

  const handleUsername = e => {
    e.preventDefault();
    // socket.emit('username', username);
    // setConnected(true);
    
    socket.auth = { username };
    socket.connect();
    // console.log(socket);

    setTimeout(() => {
      if (socket.connected) setConnected(true);
    }, 300);
  };

  const handleUsernameClick = user => {
    if (user.self || !user.connected) return;

    user.hasNewMessages = false;
    setSelectedUser(user);

    let allUsers = users;
    let index = allUsers.findIndex(u => u.userID === user.userID);
    let foundUser = allUsers[index];
    foundUser.hasNewMessages = false;
    
    allUsers[index] = foundUser;
    setUsers([...allUsers]);
  };

  const handlePrivateMessage = (e) => {
    e.preventDefault();

    if (selectedUser) {
      socket.emit("private message", {
        message: privateMessage,
        to: selectedUser.userID,
      });

      let updated = selectedUser;
      updated.messages.push({
        message: privateMessage,
        fromSelf: true,
        // hasNewMessages: false,
      });
      setSelectedUser(updated);
      setPrivateMessage("");
    }
  };

  const handleMessage =  e => {
    e.preventDefault();
    socket.emit("message", {
      id: Date.now(),
      name: username,
      message,
    });
    setMessage('');
  };

  if (message) {
    socket.emit("typing", username);
  }

  useEffect(() => {
    socket.on("typing", (data) => {
      setTyping(data);

      setTimeout(() => {
        setTyping("");
      }, 1000);
    });

    return () => {
      socket.off("typing");
    };
  }, []);

  useEffect(() => {
    socket.on('user connected', user => {
      user.connected = true;
      user.messages = [];
      user.hasNewMessages = false;
      setUsers(prevUsers => [...prevUsers, user]);
      toast.success(`${user.username} joined.`);
    });

    socket.on('user joined', msg => {
      console.log(msg);
    });

    socket.on('message', data => {
      setMessages(prevMsg => [...prevMsg, {
        id: data.id,
        name: data.name,
        message: data.message
      }]);
    });

    return () => {
      socket.off('user connected');
      socket.off('user joined');
      socket.off('message');
    }
  }, []);

  useEffect(() => {
    socket.on("user disconnected", (id) => {
      let allUsers = users;

      let index = allUsers.findIndex((el) => el.userID === id);
      let foundUser = allUsers[index];
      foundUser.connected = false;

      allUsers[index] = foundUser;
      setUsers([...allUsers]);
      toast.error(`${foundUser.username} left!`)
    });

    return () => {
      socket.off("user disconnected");
    };
  }, [users, socket]);

  useEffect(() => {
    socket.on('users', users => {
      // setUsers(users);
      users.forEach(user => {
        user.self = user.userID === socket.id;
        user.connected = true;
        user.messages = [];
        user.hasNewMessages = false;
      });
      // put the current user first, and sort by username
      const sorted = users.sort((a, b) => {
        if (a.self) return -1;
        if (b.self) return 1;
        if (a.username < b.username) return -1;
        return a.username > b.username ? 1 : 0;
      })

      setUsers(sorted);
    });

    socket.on('username taken', () => {
      toast.error(`${username} is taken!!`);
      setUsername('');
    });

    return () => {
      socket.off('users');
      socket.off('username taken');
    }
  }, [socket]);

  useEffect(() => {
    socket.on("private message", ({ message, from }) => {
      const allUsers = users;
      let index = allUsers.findIndex(u => u.userID === from);
      let foundUser = allUsers[index];

      foundUser.messages.push({
        message,
        fromSelf: false
      });

      if (foundUser) {
        if (selectedUser) {
          if (foundUser.userID !== selectedUser.userID) {
            foundUser.hasNewMessages = true;
          }
        } else {
          foundUser.hasNewMessages = true;
        }

        allUsers[index] = foundUser;
        setUsers([...allUsers]);
      }
      
    });

    return () => {
      socket.off("private message");
    };
  }, [users]);

  return (
    <div className="container-fluid p-3">
      <Toaster />

      <div className="bg-primary text-light p-4">
        REALTIME CHAT APP
        <hr /> 
        <p className="lead">Public and private chat</p>
      </div>

      {!connected && (
        <div className="row">
          <form onSubmit={handleUsername} className="text-center pt-3">
            <div className="row g-3">
              <div className="col-md-8">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  type="text"
                  placeholder="Enter your name"
                  className="form-control"
                />
              </div>

              <div className="col-md-4">
                <button className="btn btn-secondary w-100" type="submit">
                  Join
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="row">
        <div className="col-md-2 pt-3">
          {connected && users.map(user => (
            <div 
              key={user.userID}
              style={{ textDecoration: selectedUser?.userID === user.userID && 'underline' }} 
              onClick={() => handleUsernameClick(user)}
            >
              {nameUpperCase(user.username)} {user.self && "(yourself)"}
              {user.connected ? (
                <span className="online-dot mx-2"></span>
              ) : (
                <span className="offline-dot mx-2"></span>
              )}
              {user.hasNewMessages && <b className="text-warning mx-2"><i class="fa-solid fa-envelope"></i></b>}
              {user.hasNewMessages && <b className="text-warning">{user.hasNewMessages && user.messages.length}</b>}
            </div>
          ))}
        </div>

        {connected && (
          <div className="col-md-5">
            <form onSubmit={handleMessage} className="text-center pt-3">
              <div className="row g-3">
                <div className="col-10">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    type="text"
                    placeholder="Type your message (public)"
                    className="form-control"
                  />
                </div>

                <div className="col-2">
                  <button className="btn btn-secondary w-100" type="submit">
                    Send
                  </button>
                </div>
              </div>
            </form>
            <br />

            <div className="col">
                <ScrollToBottom className={ROOT_CSS}>
                  {messages.map((m) => (
                    <div className="alert alert-secondary" key={m.id}>
                      {nameUpperCase(m.name)} - {m.message}
                    </div>
                  ))}
                </ScrollToBottom>
                <br />

                {typing && typing}
              </div>
          </div>
        )}

        <br />
          
        {selectedUser && (
          <div className="col-md-5">
            <form onSubmit={handlePrivateMessage} className="text-center pt-3">
              <div className="row g-3">
                <div className="col-10">
                  <input
                    value={privateMessage}
                    onChange={(e) => setPrivateMessage(e.target.value)}
                    type="text"
                    placeholder="Type your message (Private)"
                    className="form-control"
                  />
                </div>

                <div className="col-2">
                  <button className="btn btn-secondary w-100" type="submit">
                    Send
                  </button>
                </div>
              </div>
            </form>
            <br />

            <div className="col">
                <ScrollToBottom className={ROOT_CSS}>
                  {selectedUser && selectedUser.messages && selectedUser.messages.map((msg, index) => (
                    <div key={index} className="alert alert-info">
                      {msg.fromSelf 
                        ? `(yourself): ${msg.message}` 
                        : `${nameUpperCase(selectedUser.username)}: ${msg.message}`}
                    </div>
                  ))}
                </ScrollToBottom>
                <br />

                {typing && typing}
              </div>
          </div>
        )}
        <br />

      </div>
    </div>
  );
}

export default App;
