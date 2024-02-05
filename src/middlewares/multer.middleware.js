import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
    //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.originalname)
      // console.log(file);
      // console.log(file.originalname);
    }
})

// console.log(storage);
  
const upload = multer({ 
    // storage:storage,
    storage,
})

export {upload}

