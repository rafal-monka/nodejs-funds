
const express = require('express')
const router = express.Router()
const schedule = require('node-schedule')
const ikp = require("./../libs/ikp")

router.get('/covid-vaccine/:date_to/:patient_id/:x_csrf_token', (req, res, next) => {
    //res.json([req.params.patient_id, req.params.x_csrf_token])
    //return

    //Internetowe Konto Pacjenta - Covid vaccine requests
    //schedule
    cronParams = "*/10 6-21 * * 0-6" 
    console.log('schedule IKPCovidVaccine', new Date(), cronParams)
    if (false) schedule.scheduleJob(cronParams, function(){ 
        console.log('IKPCovidVaccine...')
        ikp.IKPFindVaccine(req.params.date_to, req.params.patient_id, req.params.x_csrf_token).then(response => {
            ikp.IKPSendEmail(response)
        })
    })
    
    //run now
    ikp.IKPFindVaccine(req.params.date_to, req.params.patient_id, req.params.x_csrf_token).then(response => {
        ikp.IKPSendEmail(response)
    })

    res.json({
        title: 'IKPCovidVaccine schedule', 
        cronParams: cronParams, 
        date_to: req.params.date_to, 
        patient_id: req.params.patient_id, 
        x_csrf_token: req.params.x_csrf_token
    })
})

module.exports = router

