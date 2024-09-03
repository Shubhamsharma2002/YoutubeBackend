
import 'dotenv/config';
import connectDB from './db/index.js';
import {server} from './app.js';

const port = process.env.PORT || 8000;

// 1st way

// connectDB()
// .then(() =>{
//     server.listen(port, () =>{
//         console.log(`server is listing on port no : ${port}`);
        
//     })
// })
// .catch((err) =>{
//     console.log('mogodb connection failed!!' , err);
    
// })


// 2.nd way 

server.listen(port, () =>{
       console.log(`server is fired sucessfully on port no ${port}`);
       connectDB();
       
})