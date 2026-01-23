import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AcaraLayout from '@/Layouts/AcaraLayout';
import DivisionSidebar from './Components/DivisionSidebar';
import RequirementsManager from './Components/RequirementsManager';
import OwnerSection from './Components/OwnerSection';
import CommitteeSection from './Components/CommitteeSection';
import RundownSection from './Components/RundownSection';
import VisibilityControls from './Components/VisibilityControls';
import AddDivisionModal from './Modals/AddDivisionModal';
import AddRequirementModal from './Modals/AddRequirementModal';

export default function PreparationIndex({ 
    activity, 
    divisions, 
    committeeStructure, 
    participants, 
    rundowns, 
    materials, 
    owners, 
    refPositions 
}) {
    const { auth } = usePage().props;
    
    // Ensure divisions is an array to prevent "find is not a function" error if backend returns object/collection
    const divisionsList = Array.isArray(divisions) ? divisions : (divisions ? Object.values(divisions) : []);

    const [selectedDivisionId, setSelectedDivisionId] = useState(null);
    const [showParticipants, setShowParticipants] = useState(false); // Local toggle for previewing participants in preparation
    const [showDescription, setShowDescription] = useState(true);
    const [showGallery, setShowGallery] = useState(true);

    // Effect to select first division if available and none selected
    useEffect(() => {
        if (divisionsList.length > 0 && !selectedDivisionId) {
            setSelectedDivisionId(divisionsList[0].id);
        }
    }, [divisionsList]);

    const handleDivisionSelect = (id) => {
        setSelectedDivisionId(id);
    };

    const selectedDivision = divisionsList.find(d => d.id === selectedDivisionId);

    return (
        <AcaraLayout
            title={`Persiapan - ${activity.name}`}
            activity={activity}
        >
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Manajemen Persiapan Acara</h1>
                                <p className="text-gray-600 mt-1">{activity.name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Owner Section */}
                    <OwnerSection owners={owners} activity={activity} />

                    {/* Visibility Controls */}
                    <VisibilityControls activity={activity} />

                    {/* Committee Structure Section */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow p-4 mb-6">
                        <CommitteeSection 
                            activity={activity}
                            committeeStructure={committeeStructure}
                            refPositions={refPositions}
                            divisions={divisionsList}
                            participants={participants}
                        />
                    </div>

                    {/* Main Content Area: Division Sidebar + Requirements Manager */}
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Sidebar */}
                        <div className="w-full md:w-1/3 lg:w-1/4">
                            <DivisionSidebar 
                                divisions={divisionsList} 
                                selectedDivisionId={selectedDivisionId} 
                                onSelect={handleDivisionSelect} 
                            />
                        </div>

                        {/* Content */}
                        <div className="w-full md:w-2/3 lg:w-3/4">
                            {selectedDivisionId ? (
                                <RequirementsManager 
                                    divisionId={selectedDivisionId} 
                                    divisions={divisionsList}
                                    activity={activity}
                                />
                            ) : (
                                <div className="bg-white rounded-xl border border-gray-200 shadow p-8 text-center text-gray-500">
                                    <i className="fas fa-clipboard-list text-4xl mb-4 text-gray-300"></i>
                                    <p>Pilih divisi untuk mengelola kebutuhan.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Rundown Section (Optional, if needed below) */}
                    {/* <RundownSection rundowns={rundowns} activity={activity} /> */}
                </div>
            </div>

            {/* Modals */}
            <AddDivisionModal activity={activity} />
            <AddRequirementModal activity={activity} />
        </AcaraLayout>
    );
}
