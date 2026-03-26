const express = require("express");
const path = require("path");
const multer = require('multer');
const mysql = require("mysql2");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "fontend")));

const db = mysql.createConnection({
  host: "mysql",
  user: "test",
  password: "1234",
  database: "testSahagit"
});

db.connect(err => {
  if (err) {
    console.log(err)
    return
  }
  console.log("MySQL Connected")
});

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

app.use("/uploads", express.static("uploads"));


const upload = multer({ storage });


// หน้าแรก
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "fontend", "main.html"));
});

app.get("/products", (req, res) => {
  db.query("SELECT * FROM products", (err, result) => {
    if (err) return res.json(err);
    res.json(result);
  });
});

app.get("/products/:id", (req, res) => {
  db.query(
    "SELECT * FROM products WHERE id=?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result[0]);
    }
  );
});

app.get("/users", (req, res) => {
  db.query("SELECT * FROM users", (err, result) => {
    if (err) return res.json(err);
    res.json(result);
  });
});

app.get("/cart", (req, res) => (
  db.query("SELECT * FROM cart", (err, result) => {
    if (err)
      return res.json(err);
    res.json(result);
  })
))

app.post("/cart", (req, res) => {

 const id = req.body.id;
 const Username = req.body.Username;

 db.query(
  "INSERT INTO cart (productname, price, category, qty, image,Username) SELECT productname, price, 1, qty, image,? FROM products WHERE id=?",
    [Username,id],
      (err, result) => {

          if(err){
              console.log(err);
              res.status(500).json(err);
          }else{
              res.json({
              message:"เพิ่มสินค้าแล้ว"
          });
          }
        }
      );
});


app.get("/productsmain", (req, res) => {
  db.query("SELECT * FROM products", (err, result) => {
    if (err) return res.json(err);
    res.gson(result);
  })
})
app.post("/products", upload.single("image"), (req, res) => {

  const { productname, price, category, qty } = req.body;

  const image = req.file ? req.file.filename : null;


  db.query(
    "INSERT INTO products(productname,price,category,qty,image) VALUES(?,?,?,?,?)",
    [productname, price, category, qty, image],
    (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json(err);
      }

      res.json({ message: "added" });
    }
  );

});

app.post("/users", (req, res) => {
  const { Username, Password } = req.body;

  if (!Username || !Password) {
    return res.status(400).json({
      message: "Username or Password incorrect "
    })
  }
  else {
    db.query(
      "INSERT INTO users(Username,Password) VALUES(?,?)",
      [Username, Password],
      (error) => {
        if (error) {
          console.log(error);
          return res.status(500).json(error);
        }
        res.json({ message: "Add Usename and Password sussesfully" })
      }
    );
  }
});

app.post("/login", (req, res) => {

  const { Username, Password } = req.body;
  if (!Username && !Password) {
    return res.json({ status: "fail" }),
      console.log("fail username")
  }if(!Username){
    return res.json({status:"NoUsername"}),
    console.log("กรอกผู้ใช้งานก่อน")
  }if(!Password){
    return res.json({status:"NoPassword"}),
    console.log("กรอกรหัสผ่าน")
  }
  db.query(
    "SELECT * FROM users WHERE Username=? AND Password=?",
    [Username, Password],
    (err, result) => {

      if (result.length > 0) {
        res.json({ status: "success", Username: result[0],Username });
      } else {
        res.json({ status: "fail" });
      }

    })

})

app.put("/products/:id", upload.single("image"), (req, res) => {

  const { productname, price, category, qty } = req.body;
  const id = req.params.id;
  const image = req.file ? req.file.filename : null;
  console.log("BODY:", req.body);
  console.log("ID:", id);

  let sql;
  let values;

  if (image) {
    sql = `UPDATE products SET productname=?, price=?, category=?, qty=?, image=? WHERE id=?`;
    values = [productname, price, category, qty, image, id];
  } else {
    sql = `UPDATE products SET productname=?, price=?, category=?, qty=? WHERE id=?`;
    values = [productname, price, category, qty, id];
  }

  db.query(sql, values, (err) => {
    if (err) {
      console.log(err);
      return res.status(500).json(err);
    }
    res.json({ message: "updated" });
  });

});


app.delete("/users/:id", (req, res) => {

  const id = req.params.id;

  db.query(
    "DELETE FROM users WHERE id = ?",
    [id],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          error: err
        });
      }
      res.json({
        message: "User deleted successfully",
        result: result
      });
    }
  );
});

app.delete("/products/:id", (req, res) => {
  const id = req.params.id;
  db.query(
    "SELECT image FROM products WHERE id=?",
    [id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      const image = result[0]?.image;
      if (image) {
        fs.unlink(`./uploads/${image}`, err => {
          if (err) console.log("delete image error:", err);
        });
      }
      db.query(
        "DELETE FROM products WHERE id=?",
        [id],
        err => {
          if (err) return res.status(500).json(err);
          res.json({ message: "deleted" });
        }
      );

    }
  );

});

app.delete("/cart/:id",(req,res)=>{
  const id = req.params.id;
  db.query("DELETE FROM cart WHERE id=?",
    [id],
    (err,result) =>{
      if(err)
        return res.status(500).json(err)
        res.json({message: "deleted"});
    }
  )
})



app.put("/cart/:id",(req,res)=>{
 const id = req.params.id;
 const category = req.body.category;
 db.query(
  "UPDATE cart SET category=? WHERE id=?",
  [category,id],
  (err,result)=>{
   if(err){
    return res.status(500).json(err);
   }
   res.json({message:"updated"});
  }
 )
})

app.post("/Sale", (req, res) => {
  db.query(
    "INSERT INTO Sale (productname, Username) SELECT productname, Username FROM cart",
    (err, result) => {
      if (err) {
        return res.json({ message: "ชำระเงินไม่สำเร็จ" });
      }
      db.query(`UPDATE products p JOIN cart c ON p.productname = c.productname SET p.category = p.category - c.category`, 
        (err2, result2) => {
        if (err2) {
          return res.json({ message: "ตัดสต็อกไม่สำเร็จ" });
        }
        db.query("DELETE FROM cart", (err3) => {
          if (err3) {
            return res.json({ message: "ลบ cart ไม่สำเร็จ" });
          }
          res.json({ message: "ชำระเงินสำเร็จแล้ว" });
        });
      });
    }
  );
});

app.get("/Sale",(req,res)=>{
  db.query("SELECT * FROM Sale",
    (err,result)=>{
      if(err){
        res.json({message:"ล้มเหลว"})
      }
      res.status(200).json(result);
    }
  )
})

app.put("/users/:id",(req,res)=>{
 const id = req.params.id;
 const point = req.body.point;
 db.query(
  "UPDATE users SET point=? WHERE id=?",
  [point,id],
  (err,result)=>{
   if(err){
    return res.status(500).json(err);
   }
   res.json({message:"updated"});
  }
 )
})



app.listen(8001, () => {
  console.log("Server running on 8001")
});
