import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AcaraLayout from '@/Layouts/AcaraLayout';
import DivisionSidebar from './Components/DivisionSidebar';
import RequirementsManager from './Components/RequirementsManager';
import CorePreparationSection from './Components/CorePreparationSection';
import CommitteeSection from './Components/CommitteeSection';
import GallerySection from './Components/GallerySection';
import RundownSection from './Components/RundownSection';
import ParticipantsSection from './Components/ParticipantsSection';
import SectionContainer from './Components/SectionContainer';
import AddDivisionModal from './Modals/AddDivisionModal';
import AddRequirementModal from './Modals/AddRequirementModal';
import AddOwnerModal from './Modals/AddOwnerModal';

export default function PreparationIndex({
    activity,
    divisions,
    committeeStructure,
    participants,
    rundowns,
    materials,
    owners,
    refPositions,
    participationTypes
}) {
    const { auth } = usePage().props;
    const divisionsList = Array.isArray(divisions) ? divisions : (divisions ? Object.values(divisions) : []);
    const [selectedDivisionId, setSelectedDivisionId] = useState(null);

    useEffect(() => {
        if (divisionsList.length > 0 && !selectedDivisionId) {
            setSelectedDivisionId(divisionsList[0].id);
        }
    }, [divisionsList]);

    const handleDivisionSelect = (id) => {
        setSelectedDivisionId(id);
    };

    return (
        <AcaraLayout
            title={`Persiapan - ${activity.name}`}
            activity={activity}
        >
            <div className="min-h-screen bg-[#fafbfc] py-10 font-primary">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* modern header */}
                    <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-2">
                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
                                    <i className="fas fa-tools mr-2"></i> Preparation Hub
                                </div>
                                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-none">Manajemen Persiapan</h1>
                                <p className="text-lg text-gray-500 font-medium">Melengkapi segala kebutuhan untuk <span className="text-primary font-bold underline decoration-primary/30 decoration-4 underline-offset-4">{activity.name}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* combined panels: owners and participation types */}
                    <CorePreparationSection
                        owners={owners}
                        participationTypes={participationTypes}
                        activity={activity}
                    />

                    {/* main content grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* left column: participants and committee */}
                        <div className="lg:col-span-8 space-y-10">

                            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-2 overflow-hidden">
                                <CommitteeSection
                                    activity={activity}
                                    committeeStructure={committeeStructure}
                                    refPositions={refPositions}
                                    divisions={divisionsList}
                                    participants={participants}
                                />
                            </div>

                            <SectionContainer title="Rundown Acara" activity={activity}>
                                <RundownSection activity={activity} rundowns={rundowns} />
                            </SectionContainer>
                        </div>

                        {/* right column: gallery and others */}
                        <div className="lg:col-span-4 space-y-10">
                            <SectionContainer title="Galeri & Materi" activity={activity}>
                                <GallerySection activity={activity} materials={materials} />
                            </SectionContainer>
                        </div>
                    </div>

                    {/* Requirements section - wider at bottom */}
                    <div className="mt-10 bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Kebutuhan Per Divisi</h3>
                                <p className="text-gray-500 font-medium italic">Monitor kesiapan operasional setiap tim</p>
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100 min-h-[600px]">
                            <div className="w-full md:w-1/3 lg:w-1/4 bg-gray-50/20">
                                <DivisionSidebar
                                    divisions={divisionsList}
                                    selectedDivisionId={selectedDivisionId}
                                    onSelect={handleDivisionSelect}
                                />
                            </div>
                            <div className="flex-1 bg-white">
                                {selectedDivisionId ? (
                                    <div className="p-8 animate-in fade-in duration-300">
                                        <RequirementsManager
                                            divisionId={selectedDivisionId}
                                            divisions={divisionsList}
                                            activity={activity}
                                        />
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center p-20 text-center">
                                        <div className="h-24 w-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-200">
                                            <i className="fas fa-layer-group text-5xl"></i>
                                        </div>
                                        <h4 className="text-xl font-bold text-gray-900 mb-2">Pilih Divisi</h4>
                                        <p className="text-gray-400 max-w-xs mx-auto font-medium">Silakan pilih divisi di menu samping untuk mulai mengelola daftar kebutuhan mereka.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AddDivisionModal activity={activity} />
            <AddRequirementModal activity={activity} />
            <AddOwnerModal activity={activity} />
        </AcaraLayout>
    );
}
