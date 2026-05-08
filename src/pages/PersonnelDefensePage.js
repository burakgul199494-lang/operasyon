import React from 'react';
import PersonnelDefensePanel from '../components/PersonnelDefensePanel';

const PersonnelDefensePage = ({ allData, quantitiesData, onBack }) => {
  return (
    <PersonnelDefensePanel 
      allData={allData} 
      quantitiesData={quantitiesData} 
      onBack={onBack} 
    />
  );
};

export default PersonnelDefensePage;
