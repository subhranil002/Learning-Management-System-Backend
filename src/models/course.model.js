import { model, Schema } from "mongoose";

const courseSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            maxLength: [59, "Title should be less than 60 characters"],
            trim: true,
            unique: true,
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            minLength: [50, "Description should be greater than 50 characters"],
            maxLength: [200, "Description should be less than 200 characters"],
            trim: true,
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true,
        },
        thumbnail: {
            public_id: {
                type: String,
            },
            secure_url: {
                type: String,
            },
        },
        lectures: [
            {
                title: {
                    type: String,
                    trim: true,
                },
                description: {
                    type: String,
                    trim: true,
                },
                lecture: {
                    public_id: {
                        type: String,
                    },
                    secure_url: {
                        type: String,
                    },
                },
            },
        ],
        numbersOfLectures: {
            type: Number,
            default: 0,
        },
        createdBy: {
            name: {
                type: String,
            },
            _id: {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        },
    },
    {
        timestamps: true,
    }
);

courseSchema.pre("save", function (next) {
    this.numbersOfLectures = this.lectures.length;
    next();
});

const Course = model("Course", courseSchema);

export default Course;
