const DEFAULT_EVENTS = [
            {
                id: 'evt_01',
                title: 'State-Level AWS Cloud Deployment Hackathon',
                category: 'upcoming',
                mode: 'Hybrid Event',
                date: 'Oct 24, 2026',
                time: '09:30 AM IST',
                chiefGuest: 'Mr. B. Aravindh (Cloud & DevOps Engineer, Orionshift)',
                topic: 'Build resilient multi-region architectures and automated CI/CD pipelines.',
                participants: '350+ Registrations',
                posterUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800'
            },
            {
                id: 'evt_02',
                title: 'Docker & Kubernetes Bootcamp for Beginners',
                category: 'upcoming',
                mode: 'Online Workshop',
                date: 'Nov 12, 2026',
                time: '02:00 PM IST',
                chiefGuest: 'Mr. Gunasekaran Selvarasu (Team Lead, Doodleblue Innovations)',
                topic: 'Container orchestration, microservices deployment, and Pod scaling.',
                participants: '200+ Enrolled',
                posterUrl: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&q=80&w=800'
            },
            {
                id: 'evt_03',
                title: 'Cloud Security & Serverless Architecture 101',
                category: 'past',
                mode: 'Offline Lab',
                date: 'Aug 05, 2026',
                time: '10:00 AM IST',
                chiefGuest: 'Dr. J. Noorul Ameen (Head-AIML, EGSPEC)',
                topic: 'AWS Lambda, IAM Policies, and zero-trust cloud infrastructure.',
                participants: '280 Attendees',
                posterUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800'
            }
        ];

const DEFAULT_COMMUNITY_MEMBERS = [
            { role: "President", name: "Swetha .V", organization: "II-MCA, EGSPEC", email: "swethashiyam14@gmail.com", phone: "N/A", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Swetha" },
            { role: "Vice President", name: "Abinaya .R", organization: "II-MCA, EGSPEC", email: "abinayarajmohan45@gmail.com", phone: "N/A", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Abinaya" },
            { role: "Joint Secretary", name: "Tholkappiyan .M", organization: "II-MCA, EGSPEC", email: "Thols101@gmail.com", phone: "N/A", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tholkappiyan" },
            { role: "Treasurer", name: "Ashiqhur Rahman I", organization: "II-MCA, EGSPEC", email: "ashikofficial0803@gmail.com", phone: "9944395848", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ashiqhur%20Rahman" },
            { role: "Public Relations", name: "Srivaishnavi-M.R.", organization: "II-MCA, EGSPEC", email: "srijaga03@gmail.com", phone: "N/A", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Srivaishnavi" },
            { role: "Technical Events Head", name: "Sindhu B", organization: "II-MCA, EGSPEC", email: "Sindhuz2005@gmail.com", phone: "N/A", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sindhu" },
            { role: "Web Developer", name: "S.Abinaya", organization: "II-MCA, EGSPEC", email: "abinayaselvam094@gmail.com", phone: "N/A", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=AbinayaWeb" },
            { role: "Graphic Designer", name: "Santhiya K", organization: "II-MCA, EGSPEC", email: "santhiyak10112005@gmail.com", phone: "N/A", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Santhiya" },
            { role: "Content Writer", name: "Priyadharshini R", organization: "II-MCA, EGSPEC", email: "Dharshinipriyaa1303@gmail.com", phone: "N/A", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priyadharshini" },
            { role: "Community Manager", name: "Menaga K", organization: "II-MCA, EGSPEC", email: "Menagamenaga11526@gmail.com", phone: "N/A", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Menaga" },
            { role: "Newsletter & Portfolio Editor", name: "Mohamed Nafil", organization: "II-MCA, EGSPEC", email: "mohamednafil808@gmail.com", phone: "N/A", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mohamed%20Nafil" },
            { role: "Design Team Lead", name: "Rajasri V", organization: "II-MCA, EGSPEC", email: "Rajasriammu0327@gmail.com", phone: "N/A", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rajasri" },
            { role: "Reporting & Documentation", name: "Monisha K", organization: "II-MCA, EGSPEC", email: "Monishakannan1705@gmail.com", phone: "N/A", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Monisha" },
            { role: "Mentorship Coordinator", name: "Arthika A", organization: "II-MCA, EGSPEC", email: "arthikaanbu1201@gmail.com", phone: "9585809258", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arthika" },
            { role: "Social Media Lead", name: "Nibetha J", organization: "II-MCA, EGSPEC", email: "Nibetha2005@gmail.com", phone: "N/A", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nibetha" },
            { role: "Faculty Convener", name: "Dr. J. Vanitha", organization: "Professor & Head MCA, EGSPEC", email: "vanitha@egspec.ac.in", phone: "N/A", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=DrVanitha" },
            { role: "Faculty Mentor", name: "Mrs. A. Hema", organization: "Assistant Professor MCA, EGSPEC", email: "hema@egspec.ac.in", phone: "N/A", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Hema" },
            { role: "Academic Expert", name: "Dr. J. Noorul Ameen", organization: "Head(I) - AIML, EGSPEC", email: "noorulameen@egspec.ac.in", phone: "N/A", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=NoorulAmeen" },
            { role: "Industry Expert", name: "Mr. B. Aravindh", organization: "Cloud & DevOps, Orionshift Pvt Ltd", email: "aravindh@orionshift.com", phone: "N/A", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aravindh" },
            { role: "Alumni Advisor", name: "Mr. Gunasekaran Selvarasu", organization: "Team Lead, Doodleblue Innovations", email: "sguna0100@gmail.com", phone: "89732 21644", linkedin: "#", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Gunasekaran" }
        ];

const DEFAULT_GALLERY_IMAGES = [
            { id: 'gal_1', title: 'AWS Cloud Architecture Workshop', url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=1000', category: 'Workshop' },
            { id: 'gal_2', title: 'Inter-College Hackathon Coding Session', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000', category: 'Hackathon' },
            { id: 'gal_3', title: 'Cloud Security & DevOps Seminar', url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=1000', category: 'Seminar' },
            { id: 'gal_4', title: 'Hands-on Kubernetes Lab Session', url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1000', category: 'Lab' }
        ];

const DEFAULT_CONTACT = {
            phone: "+91 9944395848",
            email: "cloudverse@gmail.com",
            linkedin: "https://linkedin.com",
            whatsapp: "https://chat.whatsapp.com",
            github: "https://github.com"
        };

const DEFAULT_SLIDER_METADATA = {
            tagText: "Leadership & Advisors Showcase",
            titleText: "Meet Our Core Team & Mentors"
        };

module.exports={DEFAULT_EVENTS,DEFAULT_COMMUNITY_MEMBERS,DEFAULT_GALLERY_IMAGES,DEFAULT_CONTACT,DEFAULT_SLIDER_METADATA};
