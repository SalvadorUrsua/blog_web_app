import express from "express";
import pg from "pg";

let data = [];

const dbDetails = {
    user: "postgres",
    host: "localhost",
    database: "makatangprogrammer",
    password: "2GodBDGlory",
};

const db = new pg.Client(dbDetails);
db.connect();

const port = 3000;
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const limitPoems = 5
let totalPoems = 0;
let offsetPoems = 0;
let remainingPoems = false;
let backRemainingPoems = false;
let lastFirstIdPicked = -1;
let lastTotalPicked = -1;
let firstPoemId = -1;
let backOffset = -1;

async function getTotalPoems() {
    try {
        const results = await db.query("SELECT * FROM poems ORDER BY id ASC");
        totalPoems = results.rows.length;
        firstPoemId = results.rows[0].id;
    } catch(err) {
        console.log(err);
    }
}

async function getThemes() {
    try {
      const results = await db.query("SELECT * FROM themes");
      return results;
    } catch (err) {
      console.log(err);
    }
}

async function getLastPoem(id) {    
    try {
        if(id === -1) {
            const results = await db.query("SELECT * FROM poems ORDER by id DESC");                      
            return results.rows[0];              
        } else {
            const results = await db.query("SELECT * FROM poems WHERE id = $1", [id]);                      
            return results.rows[0];   
        }
    } catch(err) {
        console.log(err);
    }
}

// async function getNextPoems() {
//     try {
//         await getTotalPoems();
//         backRemainingPoems = false;
//         const results = await db.query("SELECT * FROM poems ORDER by id ASC LIMIT $1 OFFSET $2", [limitPoems, offsetPoems]);             
//         const rowsLength = results.rows.length;
//         offsetPoems = offsetPoems + rowsLength;
//         if(offsetPoems > totalPoems || offsetPoems === totalPoems) {
//             remainingPoems = false;
//             totalPoems = 0;
//             offsetPoems = 0;
//         } else {
//             remainingPoems = true;
//             lastFirstIdPicked = results.rows[0].id;
//             lastTotalPicked = rowsLength;
//         }
//         return results.rows;  
//     } catch(err) {
//         console.log(err);
//     }
// }

// async function getInitialPoems() {
//     try {
//         totalPoems = 0;
//         offsetPoems = 0;
//         remainingPoems = false;
//         backRemainingPoems = false;
//         lastFirstIdPicked = -1;
//         lastTotalPicked = -1;
//         firstPoemId = -1;
//         backOffset = -1;
//         await getTotalPoems();
//         backRemainingPoems = false;
//         const results = await db.query("SELECT * FROM poems ORDER by id ASC LIMIT $1 OFFSET $2", [limitPoems, offsetPoems]);             
//         const rowsLength = results.rows.length;
//         offsetPoems = offsetPoems + rowsLength;
//         if(offsetPoems > totalPoems || offsetPoems === totalPoems) {
//             remainingPoems = false;
//             // totalPoems = 0;
//             offsetPoems = 0;
//             lastFirstIdPicked = results.rows[0].id
//             if(lastFirstIdPicked > firstPoemId) {
//                 backRemainingPoems = true;
//             } else {
//                 backRemainingPoems = false;
//             }
//         } else {
//             remainingPoems = true;
//             lastFirstIdPicked = results.rows[0].id;
//             lastTotalPicked = rowsLength;
//             if(lastFirstIdPicked > firstPoemId) {
//                 backRemainingPoems = true;
//             } else {
//                 backRemainingPoems = false;
//             }
//         }
//         return results.rows;  
//     } catch(err) {
//         console.log(err);
//     }
// }

async function getNextPoems() {
    try {
        await getTotalPoems();
        backRemainingPoems = false;
        const results = await db.query("SELECT * FROM poems ORDER by id ASC LIMIT $1 OFFSET $2", [limitPoems, offsetPoems]);             
        const rowsLength = results.rows.length;
        offsetPoems = offsetPoems + rowsLength;
        if(offsetPoems > totalPoems || offsetPoems === totalPoems) {
            remainingPoems = false;
            // totalPoems = 0;
            offsetPoems = 0;
            lastFirstIdPicked = results.rows[0].id
            if(lastFirstIdPicked > firstPoemId) {
                backRemainingPoems = true;
            } else {
                backRemainingPoems = false;
            }
        } else {
            remainingPoems = true;
            lastFirstIdPicked = results.rows[0].id;
            lastTotalPicked = rowsLength;
            if(lastFirstIdPicked > firstPoemId) {
                backRemainingPoems = true;
            } else {
                backRemainingPoems = false;
            }
        }
        return results.rows;  
    } catch(err) {
        console.log(err);
    }
}

async function getBackOffset() {
    const results = await db.query("SELECT * FROM poems WHERE id < $1", [lastFirstIdPicked]);
    backOffset = totalPoems - results.rows.length;
}

async function getBackPoems() {
    try {
        const results = await db.query("SELECT * FROM (SELECT * FROM (SELECT * FROM poems ORDER BY id DESC) AS selected LIMIT $1 OFFSET $2) AS selected2 ORDER BY id ASC", [limitPoems, backOffset]);
        if(results.rows.length > 0) {
            lastFirstIdPicked = results.rows[0].id;
            return results.rows;
        }
    } catch(err) {
        console.log(err);
    }
}

async function getTheme(id) {
    try {
        const results = await db.query("SELECT * FROM themes WHERE id = $1", [id]);
        return results.rows[0].theme;
    } catch(err) {
        console.log(err);
    }
}

async function isNotEmpty() {
    try {
        const results = await db.query("SELECT EXISTS (SELECT 1 FROM poems) AS has_rows");
        return results.rows[0].has_rows;
    } catch(err) {
        console.log(err);
    }
}

app.get("/", async (req, res) => {
    // console.log(await db.query("SELECT EXISTS (SELECT 1 FROM bata)").rows[0].exists);
    totalPoems = 0;
    offsetPoems = 0;
    remainingPoems = true;
    const testLang = await db.query("SELECT EXISTS (SELECT 1 FROM poems)");
    // console.log(testLang.rows[0].exists);
    const notEmpty = await isNotEmpty();
    if(notEmpty === true) {
            const latestPoem = await getLastPoem(-1);
            const theme = await getTheme(parseInt(latestPoem.theme_id));            
            const fulldate = latestPoem.date_created;
            // const date = fulldate.toISOString().split("T")[0];
            const date = fulldate.toLocaleString().split(",")[0];
            const data = {
                title: latestPoem.title,
                theme: theme,
                date: date,
                poem: latestPoem.poem,
            };
            res.render("index.ejs", data);
    } else {
        const data = {
            title: "none",
            theme: "none",
            date: "none",
            poem: "none",
        }
        res.render("index.ejs", data);
    }    
});

app.get("/add", async (req, res) => {
    totalPoems = 0;
    offsetPoems = 0;
    remainingPoems = true;
    const data = await getThemes();
    res.render("add.ejs", {
    themes: data.rows,
    });
});

// app.get("/initial", async (req, res) => {
//   const poems = await getInitialPoems();
//     res.render("more.ejs", {
//       data: poems,
//       again: remainingPoems,
//       backagain: backRemainingPoems,
//     });
// });  

app.get("/more", async (req, res) => {
  const poems = await getNextPoems();
    res.render("more.ejs", {
      data: poems,
      again: remainingPoems,
      backagain: backRemainingPoems,
    });
});        

app.get("/back", async (req, res) => {
    const results = await getBackOffset();
    const poems = await getBackPoems();
    if (backRemainingPoems) {
        if (poems.length > 0) {
            if(lastFirstIdPicked === firstPoemId) {
                remainingPoems = true;
                backRemainingPoems = false;
            }
            res.render("more.ejs", {
                data: poems,
                again: remainingPoems,
                backagain: backRemainingPoems,
            });
        }
    }
});   

app.get("/show", async (req, res) => {
    const selectedPoem = await getLastPoem(-1);
    const theme = await getTheme(parseInt(selectedPoem.theme_id));
    const fulldate = selectedPoem.date_created;
    // const date = fulldate.toISOString().split("T")[0];
    const date = fulldate.toLocaleString().split(",")[0];
    const data = {
      title: selectedPoem.title,
      theme: theme,
      date: date,
      poem: latestPoem.poem,
    };
    res.render("show.ejs", data);
});

app.get("/showmore", async (req, res) => {
    const query = req.query;
    const latestPoem = await getLastPoem(query.id);
    const theme = await getTheme(parseInt(latestPoem.theme_id));            
    const fulldate = latestPoem.date_created;
    const date = fulldate.toLocaleString().split(",")[0];
    const data = {
        title: latestPoem.title,
        theme: theme,
        date: date,
        poem: latestPoem.poem,
    };
    res.render("index.ejs", data);
});

app.post("/add", async (req, res) => {  
    if (req.body.cancel === "true") {
      res.redirect("/");
    } else {
        try {
          const theme_id = req.body.theme;          
          const title = req.body.title;
          const poem = req.body.stanzas;
          const results = db.query(
            "INSERT INTO poems (theme_id, title, poem, date_created) VALUES ($1, $2, $3, $4)",
            [theme_id, title, poem, new Date()]
          );
          console.log("Poem Saved!");
          res.redirect("/");
        } catch (err) {
          console.log(err);
        }
    }
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});