import mongoose, { Document, Schema } from "mongoose";

export interface ISource {
  title: string;
  content: string;
  score: number;
  dataset?: string;
  url?: string;
}

export interface IConversation extends Document {
  userId: mongoose.Types.ObjectId;
  question: string;
  answer: string;
  sources: ISource[];
  sessionId?: string;
  tokensUsed?: number;
  processingTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

const sourceSchema = new Schema<ISource>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    score: { type: Number, default: 0 },
    dataset: { type: String },
    url: { type: String },
  },
  { _id: false },
);

const conversationSchema = new Schema<IConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
    },
    sources: [sourceSchema],
    sessionId: {
      type: String,
      index: true,
    },
    tokensUsed: { type: Number },
    processingTime: { type: Number },
  },
  {
    timestamps: true,
  },
);

conversationSchema.index({ userId: 1, createdAt: -1 });
conversationSchema.index({ question: "text", answer: "text" });

export default mongoose.model<IConversation>(
  "Conversation",
  conversationSchema,
);
