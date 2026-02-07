import React, { useState, useEffect } from 'react';
import { Head, usePage, Link } from '@inertiajs/react';
import AcaraLayout from '@/Layouts/AcaraLayout';
import DivisionSidebar from './Components/DivisionSidebar';
import RequirementsManager from './Components/RequirementsManager';
import CorePreparationSection from './Components/CorePreparationSection';
import CommitteeSection from './Components/CommitteeSection';
import GallerySection from './Components/GallerySection';
import MaterialsSection from './Components/MaterialsSection';
import RundownSection from './Components/RundownSection';
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
    participationTypes,
    committeeTypes,
    vouchers
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
            fluid={true}
        >
            <div className="min-h-screen bg-[#fafbfc] py-1 sm:py-6 font-primary">
                <div className="w-full px-2 sm:px-6 lg:px-8">
                    {/* modern header */}
                    {/* Modern Premium Header */}
                    <div className="mb-4 sm:mb-8 pt-2 sm:pt-8 pl-2 sm:pl-6 border-l-4 sm:border-l-8 border-primary rounded-l-sm bg-gradient-to-r from-slate-50 to-transparent">
                        <div className="space-y-3">
                            <div className="text-xs font-medium text-slate-500">
                                <Link
                                    href={route('activity.detail', activity.id || activity.uid)}
                                    className="text-primary hover:underline"
                                >
                                    Detail Acara
                                </Link>
                                <span className="mx-2 text-slate-400">/</span>
                                <span className="text-slate-600">Preparation</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20">
                                    Management Center
                                </span>
                                <div className="h-px w-24 bg-primary/30"></div>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">
                                {activity.name}
                            </h1>
                            <p className="text-xl text-slate-500 font-medium max-w-4xl tracking-tight">
                                Dashboard pengelolaan operasional, logistik, dan struktur kepanitiaan secara terpadu.
                            </p>
                        </div>
                    </div>

                    {/* combined panels: owners and participation types */}
                    <CorePreparationSection
                        owners={owners}
                        participationTypes={participationTypes}
                        committeeTypes={committeeTypes}
                        activity={activity}
                    />

                    {/* main content sections */}
                    <div className="space-y-6 sm:space-y-10">
                        {/* Committee */}
                        <CommitteeSection
                            activity={activity}
                            committeeStructure={committeeStructure}
                            refPositions={refPositions}
                            divisions={divisionsList}
                            participants={participants}
                            vouchers={vouchers}
                        />

                        {/* Rundown */}
                        <SectionContainer title="Rundown Acara" activity={activity}>
                            <RundownSection activity={activity} rundowns={rundowns} />
                        </SectionContainer>

                        {/* Materials */}
                        <SectionContainer title="Materi & Dokumen" activity={activity}>
                            <MaterialsSection
                                activity={activity}
                                materials={materials.filter(m => m.file_type !== 'image')}
                            />
                        </SectionContainer>
                    </div>

                    {/* Requirements section - wider at bottom */}
                    <div className="mt-3 sm:mt-10 bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-[300px_1fr] min-h-[700px] divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                            {/* Left: Divisions (Jabatan) List */}
                            <div className="bg-gray-50/50 min-w-0 sm:sticky sm:top-0 sm:self-start sm:h-[calc(100vh-220px)]">
                                <DivisionSidebar
                                    divisions={divisionsList}
                                    selectedDivisionId={selectedDivisionId}
                                    onSelect={handleDivisionSelect}
                                />
                            </div>

                            {/* Right: Requirements (Kebutuhan) List */}
                            <div className="bg-white min-w-0">
                                {selectedDivisionId ? (
                                    <div className="p-3 sm:p-6 md:p-10 animate-in fade-in slide-in-from-right-4 duration-500">
                    <RequirementsManager
                        divisionId={selectedDivisionId}
                        divisions={divisionsList}
                        activity={activity}
                    />
                </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center p-4 sm:p-20 text-center opacity-60">
                                        <div className="h-24 w-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-300">
                                            <i className="fas fa-layer-group text-5xl"></i>
                                        </div>
                                        <h4 className="text-xl font-bold text-gray-900 mb-2">Pilih Divisi</h4>
                                        <p className="text-gray-500 max-w-xs mx-auto font-medium">Silakan pilih divisi di menu samping untuk mulai mengelola daftar kebutuhan mereka.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Gallery Section - Only show images */}
                    <div className="mt-6 sm:mt-10">
                        <SectionContainer title="Galeri Foto Kegiatan" activity={activity}>
                            <GallerySection
                                activity={activity}
                                materials={materials.filter(m => m.file_type === 'image')}
                            />
                        </SectionContainer>
                    </div>
                </div>
            </div>

            <AddDivisionModal activity={activity} />
            <AddRequirementModal activity={activity} />
            <AddOwnerModal activity={activity} />
        </AcaraLayout>
    );
}
