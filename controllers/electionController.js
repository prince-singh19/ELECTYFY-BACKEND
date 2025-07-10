
const {v4: uuid}=require("uuid")
const cloudinary = require('../utils/cloudeinary')
const path = require("path")



const ElectionModel = require('../models/electionModel')
const CandidateModel = require('../models/candidateModel')


/*==============================add new election=====
===POST :api/elections    ===protected(only admin) */

const HttpError = require("../models/ErrorModel")
const addElection = async (req,res,next) => {
 try {
     // only admin can add election
 if (!req.user.isAdmin) {
   return next(new HttpError("Only an admin can perform this action.", 403));
}

const { title, description } = req.body;
if (!title || !description) {
  return next(new HttpError("Fill all fields.", 422));
}

if (!req.files.thumbnail) {
  return next(new HttpError("Choose a thumbnail.", 422));
}

const { thumbnail } = req.files;
// image should be less than 1MB
if (thumbnail.size > 1000000) {
  return next(new HttpError("File size too big. Should be less than 1MB", 422));
}
 

let fileName = thumbnail.name;
fileName = fileName.split(".")
fileName = fileName[0] + uuid() + "." +fileName[fileName.length-1]

//upload file to uploads folder
await thumbnail.mv(path.join(__dirname,'..','uploads',fileName), async(err)=>{
    if(err){
        return next(HttpError(err))
    }
    //store image on cloudinary
 const result = await cloudinary.uploader.upload(path.join(__dirname,"..",
    "uploads",fileName),{resource_type: "image"}
 )
 if(!result.secure_url){
    return next(new HttpError("couldn't upload image to cloudinary",422))
 }

 const newElection = await ElectionModel.create({title,description,
    thumbnail:result.secure_url
 })
 res.json(newElection)
})
 } catch (error) {
    return next(new HttpError(error))
 }

}

/*==============================get all election=====
===GET :api/elections    ===protected */
const getElections = async (req, res, next) => {
  try {
    const elections = await ElectionModel.find();
    res.status(200).json(elections);
  } catch (error) {
    return next(new HttpError(error));
  }
};






/*==============================get single election=====
===GET :api/elections/:id    ===protected */
const getElection =async(req,res,next) => {
    try {
        const {id} =req.params;
    const election = await ElectionModel.findById(id);
    res.status(200).json(election);
  } catch (error) {
    return next(new HttpError(error));
  }
}




/*==============================get election candidates=====
===GET :api/elections/id/candidates    ===protected */
const getCandidatesOfElection =async(req,res,next) => {
   try {
        const {id} =req.params;
    const candidates = await CandidateModel.find({election:id});
    res.status(200).json(candidates);
  } catch (error) {
    return next(new HttpError(error));
  }
}





/*==============================get voters of election=====
===GET :api/elections/:id/voters    ===protected(only admin) */
const getElectionVoters =async(req,res,next) => {
     try {
        const {id} =req.params;
    const response = await ElectionModel.findById(id).populate('voters');
    res.status(200).json(response.voters);
  } catch (error) {
    return next(new HttpError(error));
  }
}





/*==============================update election=====
===PATCH :api/elections/:id    ===protected(only admin) */
const updateElection = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return next(new HttpError("Only an admin can perform this action.", 403));
    }

    const { id } = req.params;
    const { title, description } = req.body;

    if (!title || !description) {
      return next(new HttpError("Fill in all fields.", 422));
    }

    if (req.files && req.files.thumbnail) {
      const { thumbnail } = req.files;
      if (thumbnail.size > 1000000) {
        return next(new HttpError("Image size too big. Should be less than 1MB.", 422));
      }

      // Upload directly to cloudinary from buffer
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "image" },
        async (error, result) => {
          if (error || !result.secure_url) {
            return next(new HttpError("Image upload to Cloudinary failed", 422));
          }

          await ElectionModel.findByIdAndUpdate(id, {
            title,
            description,
            thumbnail: result.secure_url
          });

          return res.status(200).json("Election updated successfully");
        }
      );

      // pipe the buffer
      uploadStream.end(thumbnail.data);
    } else {
      // No thumbnail: only update title & description
      await ElectionModel.findByIdAndUpdate(id, { title, description });
      return res.status(200).json("Election updated successfully");
    }
  } catch (error) {
    console.error(error);
    return next(new HttpError(error.message || "Failed to update election."));
  }
};

/*==============================delete election=====
===DELETE :api/elections /:id   ===protected(only admin) */
const removeElection =async(req,res,next) => {
      try {
         // only admin can add election
if (!req.user.isAdmin) {
  return next(new HttpError("Only an admin can perform this action.", 403));
}

        const {id} =req.params;
        await ElectionModel.findByIdAndDelete(id);
    await CandidateModel.deleteMany({election:id})
    res.status(200).json("Election deleted successfully");
  } catch (error) {
    return next(new HttpError(error));
  }
}

module.exports = {addElection,getElections,getElection,getCandidatesOfElection,getElectionVoters,updateElection,removeElection}