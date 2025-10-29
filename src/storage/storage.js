/**
 * In-memory storage for offer and leads data
 * In production, this would be replaced with a database
 */

class Storage {
  constructor() {
    this.offer = null;
    this.leads = [];
    this.scoredLeads = [];
  }

  // Offer methods
  setOffer(offerData) {
    this.offer = {
      ...offerData,
      createdAt: new Date().toISOString()
    };
    return this.offer;
  }

  getOffer() {
    return this.offer;
  }

  hasOffer() {
    return this.offer !== null;
  }

  // Leads methods
  setLeads(leadsData) {
    this.leads = leadsData.map((lead, index) => ({
      ...lead,
      id: index + 1,
      uploadedAt: new Date().toISOString()
    }));
    return this.leads;
  }

  getLeads() {
    return this.leads;
  }

  hasLeads() {
    return this.leads.length > 0;
  }

  // Scored leads methods
  setScoredLeads(scoredData) {
    this.scoredLeads = scoredData.map((lead, index) => ({
      ...lead,
      id: index + 1,
      scoredAt: new Date().toISOString()
    }));
    return this.scoredLeads;
  }

  getScoredLeads() {
    return this.scoredLeads;
  }

  hasScoredLeads() {
    return this.scoredLeads.length > 0;
  }

  // Reset methods
  reset() {
    this.offer = null;
    this.leads = [];
    this.scoredLeads = [];
  }

  resetScores() {
    this.scoredLeads = [];
  }
}

// Singleton instance
const storage = new Storage();

module.exports = storage;