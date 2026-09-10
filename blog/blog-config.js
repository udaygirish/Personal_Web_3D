// Blog Configuration
const BLOG_CONFIG = {
    postsFolder: './posts/',
    imagesFolder: './images/',
    posts: [
        {
            id: 'fed-learning',
            series: 'AI field notes',
            seriesOrder: 5,
            title: 'Federated Learning and Continual Learning',
            date: '2021-08-06',
            author: 'Uday Girish Maradana',
            file: '2021-08-06-FedLearning.md',
            excerpt: 'An introduction to distributed machine learning techniques (Federated Learning) and incremental learning systems (Continual Learning).',
            tags: ['AI', 'ML', 'Federated Learning', 'Continual Learning']
        },
        {
            id: 'quantum-computing',
            series: 'AI field notes',
            seriesOrder: 4,
            title: 'Quantum Computing to Quantum Machine Learning',
            date: '2021-07-06',
            author: 'Uday Girish Maradana',
            file: '2021-07-06-QC.md',
            excerpt: 'How superposition and entanglement can scale machine learning models exponentially using tools like Cirq and Qiskit.',
            tags: ['AI', 'ML', 'Quantum Computing']
        },
        {
            id: 'low-power-cv',
            series: 'AI field notes',
            seriesOrder: 3,
            title: 'Low Power Computer Vision & Microcontrollers',
            date: '2021-06-06',
            author: 'Uday Girish Maradana',
            file: '2021-06-06-LPowerCV.md',
            excerpt: 'Exploring low-power computer vision for industrial automation and deploying models on edge devices like Google Coral and Jetson Nano.',
            tags: ['AI', 'Low Power CV', 'Embedded ML']
        },
        {
            id: 'autonomous-cv',
            series: 'AI field notes',
            seriesOrder: 2,
            title: 'AI in Robotics & Autonomous Systems',
            date: '2021-05-15',
            author: 'Uday Girish Maradana',
            file: '2021-05-15-Autonomous_CV.md',
            excerpt: 'Deep dive into computer vision, speech processing, and reinforcement learning in mobile, aerial, and defense robotics.',
            tags: ['AI', 'Robotics', 'Self Driving', 'Defence']
        },
        {
            id: 'ai-graphics',
            series: 'AI field notes',
            seriesOrder: 1,
            title: 'AI in Graphics - Gaming, VFX, Movie Making',
            date: '2021-05-10',
            author: 'Uday Girish Maradana',
            file: '2021-05-10-AI_Graphics.md',
            excerpt: 'An overview of AI techniques used for player behavior modeling, character animation, facial simulation, and VFX rendering.',
            tags: ['AI', 'Graphics', 'Gaming', 'VFX']
        },
        {
            id: 'site-updating',
            title: 'Under Constant Updation',
            date: '2020-08-14',
            author: 'Uday Girish Maradana',
            file: '2020-08-14-updating.md',
            excerpt: 'Stay tuned for more updates on my robotics and machine learning journey.',
            tags: ['Intro', 'Updates']
        },
        {
            id: 'first-post',
            title: 'My First Blog Post',
            date: '2020-01-20',
            author: 'Uday Girish Maradana',
            file: 'first-post.md',
            excerpt: 'Welcome to my blog! This is my first post exploring the intersection of AI and robotics.',
            tags: ['AI', 'Robotics', 'Introduction']
        }
    ]
};
