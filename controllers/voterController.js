const bcrypt =require('bcryptjs')
const jwt = require('jsonwebtoken')
const VoterModel = require('../models/voterModel');
const HttpError = require('../models/ErrorModel');

const registerVoter = async (req, res, next) => {
  try {
    const { fullName, email, password, password2 } = req.body;
    if (!fullName || !email || !password || !password2) {
      return next(new HttpError("Fill in all fields.", 422));
    }

    const newEmail = email.toLowerCase();
    const emailExists = await VoterModel.findOne({ email: newEmail });
    if (emailExists) {
      return next(new HttpError("Email already exist.", 422));
    }
      
    if((password.trim().length)<6){
        return next(new HttpError("password should be at least 6 characters.",422));
    }
    if(password!=password2){
        return next(new HttpError("password do not match.",422));
    }

const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(password, salt);

let isAdmin = false;
if (newEmail == "princesingh9621680755@gmail.com" || newEmail == "princeofficialy19@gmail.com") {
  isAdmin = true;
}

const newVoter = await VoterModel.create({
  fullName,
  email: newEmail,
  password: hashedPassword,
  isAdmin
});



res.status(201).json(`New voter ${fullName} created.`);


  } catch (error) {
    return next(new HttpError("Voter registration failed.", 422));
  }
};


//function to genetrate token
const generateToken = (payload) => {
    const token = jwt.sign(payload,process.env.JWT_SECRET,{expiresIn: "1d"})
    return token;
}



/*==============================Login  voter=====
===POST :api/voters/login     ===unprotected */
const loginVoter = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new HttpError("Fill in all fields.", 422));
    }

    const newEmail = email.toLowerCase();
    const voter = await VoterModel.findOne({ email: newEmail });
    if (!voter) {
      return next(new HttpError("Invalid credentials.", 422));
    }

    const comparePass = await bcrypt.compare(password, voter.password);
    if (!comparePass) {
      return next(new HttpError("Invalid credentials.", 422));
    }

const {_id:id,isAdmin,votedElections} = voter;
const token = generateToken({id,isAdmin})

res.json({token,id,votedElections,isAdmin})

  } catch (error) {
    return next(new HttpError("Login failed. Please check your credentials or try again later.", 422));
  }
};








/*==============================Get voter=====
===GET :api/voters/:id    ===unprotected */
const getVoter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const voter = await VoterModel.findById(id).select("-password");
    res.json(voter);
  } catch (error) {
    return next(new HttpError("Couldn't get voter", 404));
  }
};


module.exports = {registerVoter,getVoter,loginVoter}