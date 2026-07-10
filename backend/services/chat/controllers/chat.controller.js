import Conversation
from "../models/conversation.model.js";

export const createConversation =async(req,res)=>{

 try{
 const userId =req.headers["x-user-id"];
 console.log("userId",userId)
  const conversation =await Conversation.create({
   userId:userId
  });

  res.json(
   conversation
  );

 }catch(error){

  res.status(500).json({
   message:error.message
  });

 }

}


export const getConversations =async(req,res)=>{

 try{
 const userId =req.headers["x-user-id"];
  const conversations =await Conversation.find({

   userId:userId

  })
  .sort({
   updatedAt:-1
  });

  res.json(
   conversations
  );

 }catch(error){

  res.status(500).json({
   message:error.message
  });

 }

}

import Message
from "../models/message.model.js";

export const saveMessage =async(req,res)=>{

 try{

  const {
   conversationId,
   role,
   content,
   images,
  artifacts
  } = req.body;

  const message =await Message.create({

   conversationId,

   role,
  images,
   content,
   artifacts:
  artifacts || []

  });

  res.json(
   message
  );

 }catch(error){

  res.status(500).json({
   message:error.message
  });

 }

}



export const getMessages =async(req,res)=>{

 try{

  const messages =await Message.find({

   conversationId:
   req.params.id

  })
  .sort({
   createdAt:1
  });

  res.json(
   messages
  );

 }catch(error){

  res.status(500).json({
   message:error.message
  });

 }

}


export const updateConversation=async (req,res)=>{
try {
    const {conversationId,title}=req.body
    const conversation=await Conversation.findByIdAndUpdate( conversationId,{
        title
    })
     res.json(
   conversation
  );

 }catch(error){

  res.status(500).json({
   message:error.message
  });

}
}

export const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers["x-user-id"];

    const conversation = await Conversation.findOne({ _id: id, userId });
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found or unauthorized" });
    }

    await Conversation.deleteOne({ _id: id });
    await Message.deleteMany({ conversationId: id });

    res.json({ message: "Conversation and messages deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};