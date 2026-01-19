const mongoose = require("mongoose");

const configSchema = mongoose.Schema(
  {
    showVoters: {
      type: Boolean,
      default: true,
    },
    maxVotesPerUser: {
      type: Number,
      default: 3,
      min: 1,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one config document exists
configSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    config = new this({
      showVoters: true,
      maxVotesPerUser: 3,
    });
    await config.save();
  }
  return config;
};

const Config = mongoose.model("Config", configSchema);
module.exports = Config;
