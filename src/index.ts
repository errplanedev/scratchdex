import express from 'express';
import axios from 'axios';
import index from './utils/indexer.js';
import prisma from './utils/db.js';

const app = express();
app.use(express.json());
app.use(express.static('./public'));
app.set('view engine', 'ejs');

setInterval(() => {
  index();
}, 2000)

app.get('/users/:user', async (req, res, next) => {
  if (req.path.endsWith('/')) {
    return next();
  }
  const { user: username } = req.params;
  const user = await prisma.user.findUnique({
    where: {
      username: username,
    },
  });
  
  if (!user) {
    res.status(404).json({ message: 'User not found, indexing...' });
    try {
      const user = await (await axios.get(`https://proxy.errplane.workers.dev?url=https://api.scratch.mit.edu/users/${username}`));
      if(user.data.code == 'NotFound') {
        console.log(`${username} not found.`);
      } else {
        await prisma.user.create({
          data: {
            username: username,
            id: user.data.id
          }
        });
      }
    } catch(err) {
      if(err.message.includes('Unique constraint failed')) {
        res.redirect(req.hostname + req.path);
      }
    }
  } else {
    const { data: ocular } = await axios.get(`https://my-ocular.jeffalo.net/api/user/${username}`);
    const { data: scratch } = await axios.get(`https://proxy.errplane.workers.dev?url=https://api.scratch.mit.edu/users/${username}`);
    res.send({ ...user, ocular: { status: ocular.status, color: ocular.color }, about: scratch.profile.bio, wiwo: scratch.profile.status, country: scratch.profile.country, pfp: `${req.protocol}://${req.get('host')}/pfp/${username}` })
  }
});

app.get('/users/:user/', async (req, res) => {
  const { user: username } = req.params;
  try {
    const { data: user } = await axios.get(`${req.protocol}://${req.get('host')}/users/${username}`);
    res.render('user', { username: user.username, id: user.id, indexedAt: user.indexedAt, color: user.ocular.color, status: user.ocular.status, about: user.about, wiwo: user.wiwo, pfp: user.pfp, country: user.country });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      res.render('error', { message: 'User not found, indexing...', username: username });
    }
  }
});

app.get('/pfp/:user', async (req, res) => {
  const { user: username } = req.params;
  const { data: user } = await axios.get(`https://proxy.errplane.workers.dev?url=https://api.scratch.mit.edu/users/${username}`);
  res.redirect(user.profile.images['90x90']);
});

app.get('/count', async (req, res, next) => {
  if (req.path.endsWith('/')) {
    return next();
  }
  try {
    const users = await prisma.user.findMany();
    res.status(200).json({ count: users.length });
  } catch(err) {
    res.status(500).json({ err: err });
  }
});

app.get('/count/', (req, res) => {
  res.render('count');
});

app.listen(3000, () => {
  console.log('Listening on *:3000');
});