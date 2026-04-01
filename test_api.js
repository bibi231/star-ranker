fetch('http://localhost:3001/api/wins/recent-public').then(r=>r.json()).then(console.log).catch(console.error);
fetch('http://localhost:3001/api/stats/public').then(r=>r.json()).then(console.log).catch(console.error);
