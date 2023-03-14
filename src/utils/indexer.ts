import axios from 'axios';
import prisma from './db.js';

function parseUsers(users) {
  const result = [];
  users.forEach(user => {
    result.push({ username: user.username, id: user.id });
  });
  return result;
}

async function getMostPopular() {
  const { data: result } = await axios.get('https://scratchdb.lefty.one/v3/user/rank/global/followers');
  return parseUsers(result);
}

async function getFollowers(user: string, limit: number = 40) {
  const { data: users } = await axios.get(`https://api.scratch.mit.edu/users/${user}/followers?limit=${limit}&offset=0`);
  return parseUsers(users);
}

export default async function index() {
  const popular = await getMostPopular();
  for (const user of popular) {
    const followers = await getFollowers(user.username);
    for (const follower of followers) {
      const existingUser = await prisma.user.findFirst({
        where: { id: follower.id },
      });
      
      try {
        if (existingUser) {
          console.log(`SKIPPING ${follower.username} (${follower.id})`);
        } else {
          await prisma.user.create({
            data: {
              username: follower.username,
              id: follower.id,
            },
          });
          console.log(`INDEXING ${follower.username} (${follower.id})`);
        }
      } catch(err) {
        if(err.message.includes('Unique constraint failed')) {
          console.log(`SKIPPING ${follower.username} (${follower.id})`);
        } else {
          throw err;
        }
      }
    }
  }
}