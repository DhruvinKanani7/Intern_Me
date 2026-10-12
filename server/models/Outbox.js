import mongoose from 'mongoose';

const { Schema } = mongoose;

const outboxSchema = new Schema({
  event_type: {
    type: String,
    enum: ['generate_certificate'],
    required: true,
    index: true
  },
  payload: {
    type: Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  max_attempts: {
    type: Number,
    default: 5
  },
  next_run_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  last_error: {
    type: String
  },
  idempotency_key: {
    type: String,
    required: true,
    unique: true
  },
  created_at: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  processed_at: {
    type: Date
  }
});

const Outbox = mongoose.model('Outbox', outboxSchema);

export default Outbox;
