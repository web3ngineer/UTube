const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}

// it is a higher order function which returns function 

// const asyncHandler = (function) => { async() => {} }

// const asyncHandler = (fn) => async(req, res, next) => {
//     try {
//     await fn(req, res, next);
//     } catch (err) {
//         res.status(err.code || 500).json({
//             success: false;
//             message: err.message
//         })
//     }
// } 

// const asyncHandler = (requestHandler) => {
//     return async (req, res, next) => {
//         try {
//             await Promise.resolve(requestHandler(req, res, next));
//         } catch (error) {
//             const statusCode = error.statusCode || 500;
//             const errorMessage = error.message || "Internal Server Error";
//             res.status(statusCode).json({
//                 success: false,
//                 error: errorMessage
//             });
//         }
//     };
// };

export { asyncHandler }