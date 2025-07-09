
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

    let thumbnailUrl;

    if (req.files && req.files.thumbnail) {
      const thumbnail = req.files.thumbnail;

      if (thumbnail.size > 1000000) {
        return next(new HttpError("Image size too big. Should be less than 1mb.", 422));
      }

      // Upload directly to Cloudinary from buffer / temp file
      const result = await cloudinary.uploader.upload(
        thumbnail.tempFilePath || thumbnail.path || thumbnail.data,  // best effort
        {
          resource_type: "image",
          folder: "elections" // optional: organize in folder
        }
      );

      if (!result.secure_url) {
        return next(new HttpError("Image upload to Cloudinary failed", 422));
      }

      thumbnailUrl = result.secure_url;
    }

    // Update the election: only update thumbnail if new one was uploaded
    const updateData = {
      title,
      description
    };

    if (thumbnailUrl) {
      updateData.thumbnail = thumbnailUrl;
    }

    await ElectionModel.findByIdAndUpdate(id, updateData);

    res.status(200).json({ message: "Election updated successfully" });

  } catch (error) {
    console.error(error);
    return next(new HttpError("Something went wrong while updating election", 500));
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