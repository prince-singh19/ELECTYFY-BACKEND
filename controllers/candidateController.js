
const {v4: uuid}=require("uuid")
const cloudinary = require('../utils/cloudeinary')
const path = require("path")
const mongoose = require("mongoose")

const HttpError = require('../models/ErrorModel');
const ElectionModel = require('../models/electionModel')
const CandidateModel = require('../models/candidateModel')
const VoterModel = require('../models/voterModel')



/*==============================Add candidates=====
===POST :api/candidates    ===protected (only admin)*/
const addCandidate = async (req, res, next) => {
  try {
    // only admin can add candidate
    if (!req.user.isAdmin) {
      return next(new HttpError("Only an admin can perform this action.", 403));
    }

    const { fullName, motto, currentElection } = req.body;

    if (!fullName || !motto) {
      return next(new HttpError("Fill in all fields", 422));
    }

    if (!req.files || !req.files.image) {
      return next(new HttpError("Choose an image.", 422));
    }

    const { image } = req.files;

    // Check file size (limit: 1MB)
    if (image.size > 1000000) {
      return next(new HttpError("Image size should be less than 1MB", 422));
    }

    // Upload directly to Cloudinary from buffer
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      async (error, result) => {
        if (error || !result.secure_url) {
          return next(new HttpError("Couldn't upload image to Cloudinary", 422));
        }

        const newCandidate = new CandidateModel({
          fullName,
          motto,
          image: result.secure_url,
          election: currentElection
        });

        // Start session to add candidate to election
        const sess = await mongoose.startSession();
        sess.startTransaction();

        await newCandidate.save({ session: sess });

        const election = await ElectionModel.findById(currentElection);
        election.candidates.push(newCandidate);

        await election.save({ session: sess });

        await sess.commitTransaction();

        return res.status(201).json("Candidate added successfully");
      }
    );

    uploadStream.end(image.data);

  } catch (error) {
    console.error(error);
    return next(new HttpError(error.message || "Candidate creation failed.", 500));
  }
};

/*==============================Get Candidate=====
===GET :api/candidates/:id    ===protected */
const getCandidate = async (req,res,next) => {
   try {
    const {id} = req.params;
    const candidate = await CandidateModel.findById(id)
    res.json(candidate)
   } catch (error) {
    return next(new HttpError(error))
   }
}


/*==============================Delete Candidate=====
===DELETE :api/candidates/:id    ===protected (only admin)*/
const removeCandidate = async (req,res,next) => {
   try {
       // only admin can add election
 if (!req.user.isAdmin) {
   return next(new HttpError("Only an admin can perform this action.", 403));
}

 const {id} = req.params;
    const currentCandidate = await CandidateModel.findById(id).populate('election')

  if(!currentCandidate){
      return next(new HttpError("Couldn't delete candidate.", 422));
  }
  else{
    const sess = await mongoose.startSession();
sess.startTransaction();

await currentCandidate.deleteOne({ session: sess });

currentCandidate.election.candidates.pull(currentCandidate);

await currentCandidate.election.save({ session: sess });

await sess.commitTransaction();

res.status(200).json("Candidate deleted successfully");
  }

   } catch (error) {
    return next(new HttpError(error))
   }
}


/*==============================Vote Candidate=====
===PATCH :api/candidates/:id    ===protected */
const voteCandidate = async(req,res,next) => {
   try {
    const { id: candidateId } = req.params;
const {  selectedElection } = req.body;

// Get the candidate
const candidate = await CandidateModel.findById(candidateId);
const newVoteCount = candidate.voteCount + 1;

// Update candidate's vote count
await CandidateModel.findByIdAndUpdate(
  candidateId,
  { voteCount: newVoteCount },
  { new: true }
);

// Start session for relationship
const sess = await mongoose.startSession();
sess.startTransaction();

// Get the current voter

let voter = await VoterModel.findById(req.user.id)
await voter.save({session:sess})

//get selected election

let election = await ElectionModel.findById(selectedElection);
election.voters.push(voter);
voter.votedElections.push(election);
await election.save({session:sess})
await voter.save({session:sess})
await sess.commitTransaction();

res.status(200).json(voter.votedElections);
   } catch (error) {
    return next(new HttpError(error))
   }
}


module.exports = {addCandidate,getCandidate,removeCandidate,voteCandidate}



