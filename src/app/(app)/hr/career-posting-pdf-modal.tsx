import CareerPostingCard from './career-posting-card';
export default function CareerPostingPdfModal({id,title,location,employmentType,description}:{id:string;title:string;location:string;employmentType:string;description:string}) {
 return <CareerPostingCard posting={{id,title,location,employment_type:employmentType,description}}/>;
}
