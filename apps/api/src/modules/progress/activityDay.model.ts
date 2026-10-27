import { Schema, model, type Types } from 'mongoose';

/** One row per user per calendar day (in the user's timezone) on which they learned. */
export interface ActivityDayDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  day: string;
  /** Estimated minutes, credited proportionally to completion progress made that day. */
  minutes: number;
  lessonsCompleted: number;
  events: number;
}

const activityDaySchema = new Schema<ActivityDayDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    minutes: { type: Number, default: 0, min: 0 },
    lessonsCompleted: { type: Number, default: 0, min: 0 },
    events: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

activityDaySchema.index({ userId: 1, day: -1 }, { unique: true });

export const ActivityDay = model<ActivityDayDoc>('ActivityDay', activityDaySchema);
